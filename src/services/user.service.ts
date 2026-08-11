import { prisma } from "../config/db.connect.js";

class UserService {

  async registerUser(userData: any): Promise<any> {
    try {
      const user = await prisma.user.create({
        data: userData,
      });
      return user;
    } catch (error) {
      console.error('Error registering user:', error);
      throw new Error('User registration failed');
    }
}
}
 const userService = new UserService();

export default userService