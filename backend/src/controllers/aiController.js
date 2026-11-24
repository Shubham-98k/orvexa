export const generateOutline = async (req, res, next) => {
  try {
    const { topic, goal, sourceDiscussionContext } = req.body;
    if (!topic) return res.status(400).json({ error: 'Topic is required' });

    // AI Knowledge partner structured response
    const outline = {
      title: `${topic}: A Practical Guide`,
      sections: [
        { heading: '1. Introduction & Context', notes: 'Define the core problem and outline what readers will gain.' },
        { heading: '2. The Core Insights & Field Observations', notes: sourceDiscussionContext ? 'Drawn from community discussion perspectives.' : 'Synthesizing key real-world practices.' },
        { heading: '3. Actionable Framework & Rituals', notes: 'Concrete steps, workflows, and guardrails for implementation.' },
        { heading: '4. Common Pitfalls & How to Avoid Them', notes: 'Edge cases, miscommunication risks, and anti-patterns.' },
        { heading: '5. Conclusion & Looking Forward', notes: 'Key takeaways and community discussion prompts.' },
      ],
      keyTakeaways: [
        'Small, intentional practices compound into lasting team culture.',
        'Clarify expectations early to reduce cognitive friction.',
      ],
      provenanceNotice: sourceDiscussionContext ? 'Attributed to contributors in community discussion.' : 'Independent synthesis.',
    };

    res.json({ outline });
  } catch (err) {
    next(err);
  }
};

export const draftSection = async (req, res, next) => {
  try {
    const { sectionHeading, topic, contextNotes } = req.body;
    const draftText = `### ${sectionHeading || 'Section'}\n\nWhen exploring **${topic || 'this subject'}**, the most common friction point arises from ambiguous expectations. Rather than relying on rigid processes, effective practitioners establish clear lightweight principles that prioritize clarity, intentional check-ins, and shared accountability.\n\n${contextNotes ? `> *Community insight:* ${contextNotes}\n\n` : ''}By focusing on practical application rather than theoretical dogma, teams build trust and momentum faster.`;

    res.json({ draftText });
  } catch (err) {
    next(err);
  }
};
