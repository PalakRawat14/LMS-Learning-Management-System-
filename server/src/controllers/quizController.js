const { Quiz, QuizQuestion, QuizAttempt, Course, User } = require('../models');

// Create new quiz
const createQuiz = async (req, res) => {
  try {
    const { title, description, courseId, timeLimit, startDate, endDate, totalPoints } = req.body;

    // Check if user has permission to create quiz in this course
    const course = await Course.findByPk(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (req.user.role !== 'admin' && course.teacherId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to create quizzes in this course' });
    }

    const quiz = await Quiz.create({
      title,
      description,
      courseId,
      timeLimit,
      startDate,
      endDate,
      totalPoints
    });

    res.status(201).json({
      message: 'Quiz created successfully',
      quiz
    });
  } catch (error) {
    console.error('Create quiz error:', error);
    res.status(500).json({ message: 'Error creating quiz' });
  }
};

// Add question to quiz
const addQuizQuestion = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { question, type, options, correctAnswer, points, order } = req.body;

    const quiz = await Quiz.findByPk(quizId, {
      include: [{ model: Course }]
    });

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Check if user has permission to add questions
    if (req.user.role !== 'admin' && quiz.Course.teacherId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to modify this quiz' });
    }

    const quizQuestion = await QuizQuestion.create({
      quizId,
      question,
      type,
      options,
      correctAnswer,
      points,
      order
    });

    res.status(201).json({
      message: 'Question added successfully',
      question: quizQuestion
    });
  } catch (error) {
    console.error('Add quiz question error:', error);
    res.status(500).json({ message: 'Error adding question' });
  }
};

// Get quiz with questions
const getQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findByPk(req.params.id, {
      include: [
        {
          model: QuizQuestion,
          attributes: req.user.role === 'student' ? 
            ['id', 'question', 'type', 'options', 'points', 'order'] : 
            ['id', 'question', 'type', 'options', 'correctAnswer', 'points', 'order']
        },
        {
          model: Course,
          attributes: ['title', 'teacherId']
        }
      ]
    });

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    res.json({ quiz });
  } catch (error) {
    console.error('Get quiz error:', error);
    res.status(500).json({ message: 'Error retrieving quiz' });
  }
};

// Submit quiz attempt
const submitQuizAttempt = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { answers } = req.body;

    const quiz = await Quiz.findByPk(quizId, {
      include: [{ model: QuizQuestion }]
    });

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Check if quiz is available
    const now = new Date();
    if (now < new Date(quiz.startDate) || now > new Date(quiz.endDate)) {
      return res.status(400).json({ message: 'Quiz is not available at this time' });
    }

    // Auto-grade the quiz
    let score = 0;
    const gradedAnswers = answers.map(answer => {
      const question = quiz.QuizQuestions.find(q => q.id === answer.questionId);
      if (!question) return null;

      const isCorrect = JSON.stringify(answer.answer) === JSON.stringify(question.correctAnswer);
      if (isCorrect) {
        score += question.points;
      }

      return {
        questionId: answer.questionId,
        givenAnswer: answer.answer,
        isCorrect,
        points: isCorrect ? question.points : 0
      };
    });

    const attempt = await QuizAttempt.create({
      quizId,
      userId: req.user.id,
      answers: gradedAnswers,
      score,
      submittedAt: now,
      status: 'completed'
    });

    res.json({
      message: 'Quiz submitted successfully',
      attempt: {
        score,
        totalPoints: quiz.totalPoints,
        submittedAt: attempt.submittedAt
      }
    });
  } catch (error) {
    console.error('Submit quiz error:', error);
    res.status(500).json({ message: 'Error submitting quiz' });
  }
};

// Get quiz attempts
const getQuizAttempts = async (req, res) => {
  try {
    const { quizId } = req.params;

    const quiz = await Quiz.findByPk(quizId, {
      include: [{ model: Course }]
    });

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // For students, only return their own attempts
    const where = {
      quizId,
      ...(req.user.role === 'student' && { userId: req.user.id })
    };

    const attempts = await QuizAttempt.findAll({
      where,
      include: [{
        model: User,
        attributes: ['id', 'firstName', 'lastName', 'email']
      }],
      order: [['submittedAt', 'DESC']]
    });

    res.json({ attempts });
  } catch (error) {
    console.error('Get quiz attempts error:', error);
    res.status(500).json({ message: 'Error retrieving quiz attempts' });
  }
};

module.exports = {
  createQuiz,
  addQuizQuestion,
  getQuiz,
  submitQuizAttempt,
  getQuizAttempts
};