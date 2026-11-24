import { Company } from '../models/Company.js';

export const getCompanies = async (req, res, next) => {
  try {
    const { q, industry } = req.query;
    let filter = {};

    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { industry: { $regex: q, $options: 'i' } },
      ];
    }
    if (industry && industry !== 'All') {
      filter.industry = industry;
    }

    const companies = await Company.find(filter)
      .sort({ followersCount: -1, createdAt: -1 })
      .limit(30)
      .lean();

    // Map whether current user follows each company
    const mapped = companies.map((c) => ({
      ...c,
      isFollowing: req.user ? c.followers?.some((f) => f.toString() === req.user._id.toString()) : false,
    }));

    res.json({ companies: mapped });
  } catch (err) {
    next(err);
  }
};

export const getCompanyBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const company = await Company.findOne({ slug: slug.toLowerCase() }).lean();
    if (!company) return res.status(404).json({ error: 'Company not found' });

    const isFollowing = req.user
      ? company.followers?.some((f) => f.toString() === req.user._id.toString())
      : false;

    res.json({
      company: {
        ...company,
        isFollowing,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const toggleFollowCompany = async (req, res, next) => {
  try {
    const { companyId } = req.params;
    const userId = req.user._id;

    const company = await Company.findById(companyId);
    if (!company) return res.status(404).json({ error: 'Company not found' });

    const index = company.followers.findIndex((f) => f.toString() === userId.toString());
    let isFollowing = false;

    if (index > -1) {
      company.followers.splice(index, 1);
      company.followersCount = Math.max(0, company.followers.length);
      isFollowing = false;
    } else {
      company.followers.push(userId);
      company.followersCount = company.followers.length;
      isFollowing = true;
    }

    await company.save();
    res.json({ isFollowing, followersCount: company.followersCount });
  } catch (err) {
    next(err);
  }
};
