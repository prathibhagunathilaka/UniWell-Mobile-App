const userResponse = (user) => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  role: user.role,
  status: user.status,
  ...(user.role === "student"
    ? {
        studentId: user.studentId,
        phoneNumber: user.phoneNumber,
        faculty: user.faculty,
        year: user.year
      }
    : {})
});

module.exports = userResponse;
