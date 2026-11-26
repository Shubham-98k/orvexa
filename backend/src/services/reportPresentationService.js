import { Message } from '../models/Conversation.js';
import { DiscussionContribution } from '../models/DiscussionContribution.js';

export const addReportNavigationDetails = async (reports) => {
  const contributionReports = reports.filter((report) => report.targetType === 'contribution');
  const contributionIds = contributionReports.map((report) => report.targetId);
  const messageReports = reports.filter((report) => report.targetType === 'message');
  const messageIds = messageReports.map((report) => report.targetId);
  const contributions = contributionIds.length
    ? await DiscussionContribution.find({ _id: { $in: contributionIds } }).select('_id discussionId').lean()
    : [];
  const messages = messageIds.length
    ? await Message.find({ _id: { $in: messageIds } }).select('_id conversationId').lean()
    : [];
  const discussionIdByContributionId = new Map(
    contributions.map((contribution) => [contribution._id.toString(), contribution.discussionId?.toString()])
  );
  const conversationIdByMessageId = new Map(
    messages.map((message) => [message._id.toString(), message.conversationId?.toString()])
  );

  return reports.map((report) => {
    const reporter = report.reporterId;
    return {
      ...report,
      reporterName: reporter?.displayName || reporter?.username || report.reporterName || 'Member',
      targetParentId: report.targetType === 'contribution'
        ? discussionIdByContributionId.get(report.targetId?.toString()) || null
        : report.targetType === 'message'
          ? conversationIdByMessageId.get(report.targetId?.toString()) || null
          : null,
    };
  });
};
