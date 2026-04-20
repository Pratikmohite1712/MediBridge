const { z } = require('zod');
const prisma = require('../config/db');
const { sendSuccess, sendError } = require('../utils/response');
const { checkSymptoms } = require('../services/aiService');

const symptomSchema = z.object({
  symptoms: z.array(z.string()).min(1),
  language: z.enum(['en', 'hi', 'mr']).default('en')
});

const languageCodeToEnum = {
  en: 'ENGLISH',
  hi: 'HINDI',
  mr: 'MARATHI'
};

exports.symptomCheck = async (req, res, next) => {
  try {
    const data = symptomSchema.parse(req.body);

    const aiResult = await checkSymptoms(data.symptoms, data.language);

    // Save to DB
    await prisma.symptomLog.create({
      data: {
        userId: req.user.userId,
        symptoms: data.symptoms,
        result: aiResult,
        language: languageCodeToEnum[data.language]
      }
    });

    return sendSuccess(res, 'Symptom check completed', aiResult);
  } catch (error) {
    next(error);
  }
};
