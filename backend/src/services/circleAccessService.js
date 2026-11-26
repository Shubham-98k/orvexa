import mongoose from 'mongoose';
import { Circle } from '../models/Circle.js';
import { CircleMembership } from '../models/CircleMembership.js';
import { User } from '../models/User.js';

const sameId = (left, right) => left?.toString() === right?.toString();

export const isPlatformStaff = (user) =>
  user?.platformRole === 'admin' ||
  user?.platformRole === 'moderator' ||
  user?.role === 'admin' ||
  user?.role === 'moderator';

export const getCircleMembership = async (circle, userId) => {
  if (!circle || !userId) return null;

  const membership = await CircleMembership.findOne({
    circleId: circle._id,
    userId,
  }).lean();
  if (membership) return membership;

  if (sameId(circle.ownerId, userId)) {
    return { circleId: circle._id, userId, role: 'owner', status: 'active', legacy: true };
  }
  if (circle.members?.some((memberId) => sameId(memberId, userId))) {
    const role = circle.moderators?.some((moderatorId) => sameId(moderatorId, userId))
      ? 'moderator'
      : 'member';
    return { circleId: circle._id, userId, role, status: 'active', legacy: true };
  }
  return null;
};

export const getCircleRole = async (circle, userId) => {
  const membership = await getCircleMembership(circle, userId);
  return membership?.status === 'active' ? membership.role : null;
};

export const canViewCircle = async (circle, userId) => {
  if (!circle || ['deleted', 'suspended', 'archived'].includes(circle.status)) return false;
  if (circle.visibility === 'public' && circle.status === 'active') return true;
  const membership = await getCircleMembership(circle, userId);
  return membership?.status === 'active';
};

export const getAccessibleCircleIds = async (userId) => {
  if (!userId) return [];

  const [legacyCircles, memberships, publicCircles] = await Promise.all([
    Circle.find({
      status: 'active',
      $or: [{ ownerId: userId }, { members: userId }],
    }).select('_id ownerId members').lean(),
    CircleMembership.find({ userId }).select('circleId status').lean(),
    Circle.find({ status: 'active', visibility: 'public' }).select('_id').lean(),
  ]);
  const membershipByCircle = new Map(
    memberships.map((membership) => [membership.circleId.toString(), membership])
  );
  const ids = new Map();

  for (const membership of memberships) {
    if (membership.status === 'active') {
      ids.set(membership.circleId.toString(), membership.circleId);
    }
  }
  for (const circle of legacyCircles) {
    const storedMembership = membershipByCircle.get(circle._id.toString());
    if (storedMembership && storedMembership.status !== 'active') continue;
    ids.set(circle._id.toString(), circle._id);
  }
  for (const circle of publicCircles) {
    ids.set(circle._id.toString(), circle._id);
  }
  return [...ids.values()];
};

export const getJoinedCircleIds = async (userId) => {
  if (!userId) return [];
  const [legacyCircles, memberships] = await Promise.all([
    Circle.find({
      status: 'active',
      $or: [{ ownerId: userId }, { members: userId }],
    }).select('_id').lean(),
    CircleMembership.find({ userId, status: 'active' }).select('circleId').lean(),
  ]);
  const membershipByCircle = new Map(
    memberships.map((membership) => [membership.circleId.toString(), membership])
  );
  const joinedIds = memberships
    .filter((membership) => membership.status === 'active')
    .map((membership) => membership.circleId);
  return [
    ...new Map(
      [
        ...legacyCircles
          .filter((circle) => {
            const membership = membershipByCircle.get(circle._id.toString());
            return !membership || membership.status === 'active';
          })
          .map(({ _id }) => _id),
        ...joinedIds,
      ]
        .map((id) => [id.toString(), id])
    ).values(),
  ];
};

export const getCircleContentFilter = async (userId) => {
  const accessibleIds = await getAccessibleCircleIds(userId);
  const memberIds = new Set();
  if (userId) {
    const [memberships, legacyCircles] = await Promise.all([
      CircleMembership.find({ userId, status: 'active' }).select('circleId').lean(),
      Circle.find({
        status: 'active',
        $or: [{ ownerId: userId }, { members: userId }],
      }).select('_id').lean(),
    ]);
    memberships.forEach(({ circleId }) => memberIds.add(circleId.toString()));
    legacyCircles.forEach(({ _id }) => memberIds.add(_id.toString()));
  }
  const nonMemberAccessibleIds = accessibleIds.filter((id) => !memberIds.has(id.toString()));
  const memberAccessibleIds = accessibleIds.filter((id) => memberIds.has(id.toString()));

  const clauses = [
    { circleId: null },
    { circleId: { $exists: false } },
    { circleId: { $in: memberAccessibleIds } },
  ];
  if (nonMemberAccessibleIds.length > 0) {
    clauses.push({
      circleId: { $in: nonMemberAccessibleIds },
      $or: [{ visibility: { $exists: false } }, { visibility: 'public' }],
    });
  }
  const followingIds = userId
    ? await User.findById(userId).select('following').lean()
    : null;
  const followerVisibleAuthorIds = [
    ...(followingIds?.following || []),
    ...(userId ? [userId] : []),
  ];
  return {
    $and: [
      { $or: clauses },
      {
        $or: [
          { visibility: { $nin: ['followers', 'circle'] } },
          { visibility: 'followers', authorId: { $in: followerVisibleAuthorIds } },
          { visibility: 'circle', circleId: { $in: memberAccessibleIds } },
        ],
      },
    ],
  };
};

export const withCircleContentAccess = async (query, userId) => ({
  $and: [query, await getCircleContentFilter(userId)],
});

export const authorizeCircleContent = async ({ circleId, userId, contentType, visibility }) => {
  if (!circleId) {
    const supportedVisibilities = ['post', 'knowledge'].includes(contentType)
      ? ['public', 'followers']
      : ['public'];
    if (visibility && !supportedVisibilities.includes(visibility)) {
      return { error: 'Invalid content visibility', status: 400 };
    }
    return { circle: null, visibility: visibility || 'public' };
  }
  if (!mongoose.Types.ObjectId.isValid(circleId)) {
    return { error: 'A valid Circle is required', status: 400 };
  }
  const circle = await Circle.findOne({ _id: circleId, status: 'active' });
  if (!circle) return { error: 'Circle not found or unavailable', status: 404 };

  const role = await getCircleRole(circle, userId);
  const visitorSetting = contentType === 'post'
    ? 'allowVisitorPosts'
    : contentType === 'discussion'
      ? 'allowVisitorDiscussions'
      : null;
  if (!role && (circle.visibility !== 'public' || !visitorSetting || !circle.settings?.[visitorSetting])) {
    return { error: 'Join this Circle before publishing content', status: 403 };
  }

  const contentVisibility = visibility || 'circle';
  if (!['public', 'circle'].includes(contentVisibility)) {
    return { error: 'Invalid content visibility', status: 400 };
  }
  if (!role && contentVisibility === 'circle') {
    return { error: 'Join this Circle to publish Circle-only content', status: 403 };
  }
  if (contentVisibility === 'public' && circle.visibility !== 'public') {
    return { error: 'Content in a private Circle must remain Circle-only', status: 400 };
  }
  return { circle, role, visibility: contentVisibility };
};

export const hasCircleRole = (role, roles) => roles.includes(role);

export const writeCircleMembership = async ({ circle, userId, role, status = 'active', ...metadata }) => {
  const membership = await CircleMembership.findOneAndUpdate(
    { circleId: circle._id, userId },
    {
      $set: { role, status, ...metadata },
      $setOnInsert: { circleId: circle._id, userId },
    },
    { new: true, upsert: true, runValidators: true }
  );
  return membership;
};
