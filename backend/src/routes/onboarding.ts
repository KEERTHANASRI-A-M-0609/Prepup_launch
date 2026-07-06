import express from 'express';
import { User } from '../models/User';
import { protect } from '../middleware/auth';

const router = express.Router();

router.post('/basic', protect, async (req: any, res) => {
  const { 
    name, college, branch, graduationYear, 
    targetRole, targetCompanies, weeklyAvailableHours, customRole 
  } = req.body;
  
  if (!name || !college || !branch || !graduationYear || !targetRole) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  
  let finalTargetRole = targetRole;
  if (targetRole === "Other" && customRole) {
    finalTargetRole = customRole;
  }
  
  try {
    await User.findByIdAndUpdate(req.user.id, {
      name,
      college,
      branch,
      graduationYear,
      targetRole: finalTargetRole,
      targetCompanies,
      weeklyHours: weeklyAvailableHours,
      onboardingStep: 2
    });
    
    res.json({ success: true, nextStep: 2 });
  } catch (err) {
    res.status(500).json({ error: "Failed to update basic info" });
  }
});

router.post('/connect', protect, async (req: any, res) => {
  const { resumeUrl, githubUsername, leetcodeUsername, hackerrankUsername, linkedinUrl } = req.body;
  
  try {
    await User.findByIdAndUpdate(req.user.id, {
      resumeUrl,
      githubUrl: githubUsername ? `https://github.com/${githubUsername}` : undefined,
      leetcodeUrl: leetcodeUsername ? `https://leetcode.com/${leetcodeUsername}` : undefined,
      hackerrankUrl: hackerrankUsername ? `https://hackerrank.com/${hackerrankUsername}` : undefined,
      linkedinUrl,
      onboardingCompleted: true,
      onboardingStep: 3
    });
    res.json({ success: true, redirectTo: "/dashboard" });
  } catch (err) {
    res.status(500).json({ error: "Failed to connect profiles" });
  }
});

export default router;