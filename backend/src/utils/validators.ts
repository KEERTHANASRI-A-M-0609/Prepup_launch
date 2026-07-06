import Joi from 'joi'

export const schemas = {
  register: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    name: Joi.string().min(2).required(),
    college: Joi.string().required(),
    branch: Joi.string().required(),
    graduationYear: Joi.number().min(2020).max(2030).required(),
    cgpa: Joi.number().min(0).max(10).required(),
    phone: Joi.string().pattern(/^\+?[0-9]{10,15}$/).optional().allow(''),
    targetRole: Joi.string().optional(),
    targetCompanies: Joi.array().items(Joi.string()).optional(),
    weeklyHours: Joi.number().min(0).optional(),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  updateProfile: Joi.object({
    name: Joi.string().min(2),
    college: Joi.string(),
    branch: Joi.string(),
    cgpa: Joi.number().min(0).max(10),
    graduationYear: Joi.number().min(2020).max(2035),
    phone: Joi.string().allow(''),
    targetRole: Joi.string(),
    otherRole: Joi.string(),
    targetCompanies: Joi.array().items(Joi.string()),
    weeklyHours: Joi.number().min(0),
    currentStage: Joi.string().valid('Just Started', 'Preparing', 'Interview Ready'),
    onboardingCompleted: Joi.boolean(),
    activityLog: Joi.array().items(Joi.object({
      date: Joi.string().required(),
      tasksCompleted: Joi.number().min(0),
      hoursSpent: Joi.number().min(0),
      verifiedTasks: Joi.number().min(0),
      executions: Joi.number().min(0),
    })),
  }),

  syncSession: Joi.object({
    profile: Joi.object({
      name: Joi.string(),
      email: Joi.string().email(),
      phone: Joi.string().allow(''),
      college: Joi.string().allow(''),
      branch: Joi.string().allow(''),
      graduationYear: Joi.alternatives().try(Joi.string(), Joi.number()),
      cgpa: Joi.alternatives().try(Joi.string(), Joi.number()),
      domain: Joi.string().allow(''),
      targetRole: Joi.string().allow(''),
      targetCompanies: Joi.array().items(Joi.string()),
      weeklyHours: Joi.alternatives().try(Joi.string(), Joi.number()),
      level: Joi.string(),
      goal: Joi.string(),
    }),
    assessment: Joi.object().unknown(true).allow(null),
    platformData: Joi.object().unknown(true).allow(null),
    applications: Joi.array().items(Joi.object({
      id: Joi.string(),
      company: Joi.string().required(),
      role: Joi.string().required(),
      status: Joi.string().required(),
      deadline: Joi.string().allow(''),
      notes: Joi.string().allow(''),
    })),
    failures: Joi.array().items(Joi.object({
      id: Joi.string(),
      company: Joi.string().required(),
      role: Joi.string().required(),
      round: Joi.string().required(),
      date: Joi.string().required(),
      questionsAsked: Joi.string().allow(''),
      confidence: Joi.number().min(1).max(5).required(),
      difficulty: Joi.string().required(),
      reason: Joi.string().required(),
      tags: Joi.array().items(Joi.string()),
    })),
    activityLog: Joi.array().items(Joi.object({
      date: Joi.string().required(),
      tasksCompleted: Joi.number().min(0),
      hoursSpent: Joi.number().min(0),
      verifiedTasks: Joi.number().min(0),
      executions: Joi.number().min(0),
    })),
    knowledgeData: Joi.object().unknown(true).allow(null),
  }),

  createAssessment: Joi.object({
    dsa: Joi.number().min(0).max(100).required(),
    projects: Joi.number().min(0).max(100).required(),
    resume: Joi.number().min(0).max(100).required(),
    communication: Joi.number().min(0).max(100).required(),
    aptitude: Joi.number().min(0).max(100).required(),
    details: Joi.object({
      dsa: Joi.object({
        easyCount: Joi.number().min(0),
        mediumCount: Joi.number().min(0),
        hardCount: Joi.number().min(0),
        platforms: Joi.array().items(Joi.string()),
      }),
      projects: Joi.object({
        count: Joi.number().min(0),
        complexity: Joi.array().items(Joi.string()),
        hasGithub: Joi.boolean(),
      }),
      resume: Joi.object({
        atsScore: Joi.number().min(0).max(100),
        completeness: Joi.number().min(0).max(100),
      }),
      communication: Joi.object({
        mockInterviewScore: Joi.number().min(0).max(100),
        confidenceRating: Joi.number().min(1).max(5),
      }),
      aptitude: Joi.object({
        score: Joi.number().min(0).max(100),
      }),
    }),
  }),

  createApplication: Joi.object({
    company: Joi.string().required(),
    role: Joi.string().required(),
    status: Joi.string()
      .valid('Wishlist', 'Applied', 'Online Assessment', 'Technical Interview', 'HR Interview', 'Selected', 'Rejected')
      .required(),
    appliedDate: Joi.date(),
    deadline: Joi.date(),
    notes: Joi.string(),
  }),

  createFailure: Joi.object({
    company: Joi.string().required(),
    role: Joi.string().required(),
    round: Joi.string().required(),
    interviewDate: Joi.date().required(),
    questionsAsked: Joi.string(),
    difficulty: Joi.string().valid('Easy', 'Medium', 'Hard').required(),
    confidence: Joi.number().min(1).max(5).required(),
    rejectionReason: Joi.string()
      .valid('DSA', 'Projects', 'Communication', 'System Design', 'Unknown')
      .required(),
    tags: Joi.array().items(Joi.string()),
  }),

  intelligenceEvent: Joi.object({
    phase: Joi.string().valid('identity', 'evidence', 'intelligence', 'execution').required(),
    type: Joi.string().max(80).required(),
    title: Joi.string().max(200).required(),
    impact: Joi.string().max(500).required(),
    meta: Joi.object().unknown(true).optional(),
  }),
}

export const validate = (data: unknown, schema: Joi.Schema) => {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  })

  if (error) {
    const messages = error.details.map((d) => ({
      field: d.path.join('.'),
      message: d.message,
    }))
    throw new Error(JSON.stringify(messages))
  }

  return value
}
