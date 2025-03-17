var express = require('express');
var router = express.Router();
let userController = require('../controllers/users');
const { check_authentication, check_authorization } = require('../Utils/check_auth');
let constants = require('../Utils/constants');

router.post('/signup', async function(req, res, next) {
    try {
        let body = req.body;
        console.log("Received signup request:", body);
        
        // Validate required fields
        if (!body.username || !body.password || !body.email) {
            return res.status(400).send({
                success: false,
                message: "Username, password, and email are required"
            });
        }
        
        // Check username format (optional validation)
        if (body.username.length < 3 || body.username.length > 20) {
            return res.status(400).send({
                success: false,
                message: "Username must be between 3 and 20 characters"
            });
        }
        
        const result = await userController.createUser(
            body.username,
            body.password,
            body.email,
            'user'
        );
        
        res.status(201).send({
            success: true,
            message: "User registered successfully",
            data: {
                id: result._id,
                username: result.username,
                email: result.email
            }
        });
    } catch (error) {
        console.error("Signup error:", error.message);
        
        // Don't expose internal error details to clients
        if (error.message.includes('already exists')) {
            return res.status(409).send({
                success: false,
                message: error.message
            });
        }
        
        res.status(400).send({
            success: false,
            message: error.message
        });
    }
});

router.post('/login', async function(req, res, next) {
    try {
        const username = req.body.username;
        const password = req.body.password;
        
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: "Username and password are required"
            });
        }
        
        console.log(`Login attempt for user: ${username}`);
        
        const result = await userController.checkLogin(username, password);
        console.log(`Login successful for user: ${username}`);
        
        return res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        console.error(`Login failed for user: ${req.body.username}`, error);
        return res.status(401).json({
            success: false,
            message: error.message || "Authentication failed"
        });
    }
});

router.get('/me',check_authentication, async function(req, res, next){
    try {
      res.status(200).send({
        success:true,
        data:req.user
    })
    } catch (error) {
        next();
    }
})

// Reset password route (admin only)
router.get('/resetPassword/:id', check_authentication, check_authorization(constants.ADMIN_PERMISSION), async function(req, res, next) {
    try {
        const userId = req.params.id;
        const result = await userController.resetPassword(userId);
        res.status(200).send({
            success: true,
            message: "Password has been reset to 123456"
        });
    } catch (error) {
        next(error);
    }
});

// Change password route (requires authentication)
router.post('/changePassword', check_authentication, async function(req, res, next) {
    try {
        const { password, newPassword } = req.body;
        
        if (!password || !newPassword) {
            throw new Error("Current password and new password are required");
        }
        
        const result = await userController.changePassword(req.user._id, password, newPassword);
        
        res.status(200).send({
            success: true,
            message: "Password changed successfully"
        });
    } catch (error) {
        next(error);
    }
});

module.exports = router