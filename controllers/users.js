let userSchema = require('../models/users');
let roleSchema = require('../models/roles');
let bcrypt = require('bcrypt')
let jwt = require('jsonwebtoken')
let constants = require('../Utils/constants')


module.exports = {
    getUserById: async function(id){
        return await userSchema.findById(id).populate("role");
    },
    createUser: async function(username, password, email, role) {
        console.log(`Attempting to create user with username: ${username}, email: ${email}`);
        
        // First, check if username or email already exists
        const existingUser = await userSchema.findOne({ $or: [{ username: username }, { email: email }] });
        if (existingUser) {
            if (existingUser.username === username) {
                throw new Error(`Username ${username} already exists`);
            } else {
                throw new Error(`Email ${email} already exists`);
            }
        }
        
        let roleCheck = await roleSchema.findOne({ roleName: role });
        if (!roleCheck) {
            throw new Error(`Role ${role} does not exist`);
        }
        
        try {
            let newUser = new userSchema({
                username: username,
                password: password,
                email: email,
                role: roleCheck._id,
            });
            
            await newUser.save();
            console.log(`User created successfully: ${username}`);
            return newUser;
        } catch (error) {
            console.error(`Error creating user: ${error.message}`);
            
            // Handle MongoDB duplicate key errors
            if (error.code === 11000) {
                if (error.message.includes('username')) {
                    throw new Error(`Username ${username} already exists`);
                } else if (error.message.includes('email')) {
                    throw new Error(`Email ${email} already exists`);
                }
            }
            
            throw error;
        }
    },
    checkLogin: async function(username,password){
        if(username&&password){
            let user = await userSchema.findOne({
                username:username
            })
            if(user){
                if(bcrypt.compareSync(password,user.password)){
                    return jwt.sign({
                        id:user._id,
                        expired:new Date(Date.now()+30*60*1000)
                    },constants.SECRET_KEY);
                }else{
                    throw new Error("username or password is incorrect")
                }
            }else{
                throw new Error("username or password is incorrect")
            }
        }else{
            throw new Error("username or password is incorrect")
        }
    },
    resetPassword: async function(userId) {
        const user = await userSchema.findById(userId);
        if (!user) {
            throw new Error("User not found");
        }
        
        user.password = "123456";
        await user.save();
        return user;
    },
    changePassword: async function(userId, currentPassword, newPassword) {
        const user = await userSchema.findById(userId);
        if (!user) {
            throw new Error("User not found");
        }
        
        if (bcrypt.compareSync(currentPassword, user.password)) {
            user.password = newPassword;
            await user.save();
            return user;
        } else {
            throw new Error("Current password is incorrect");
        }
    }
}