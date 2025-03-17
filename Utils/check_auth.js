let jwt = require('jsonwebtoken')
let constants = require('../Utils/constants')
let userController = require('../controllers/users')
module.exports={
    check_authentication: async function(req, res, next) {
        try {
            if (!req.headers.authorization) {
                return res.status(401).json({
                    success: false,
                    message: "Authentication required. Please login."
                });
            }
            
            const token_authorization = req.headers.authorization;
            if (!token_authorization.startsWith("Bearer")) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid authorization format. Use 'Bearer [token]'"
                });
            }
            
            const token = token_authorization.split(" ")[1];
            if (!token) {
                return res.status(401).json({
                    success: false,
                    message: "Authentication token is missing"
                });
            }
            
            try {
                const verifiedToken = jwt.verify(token, constants.SECRET_KEY);
                console.log("Token verified:", verifiedToken);
                
                const user = await userController.getUserById(verifiedToken.id);
                if (!user) {
                    return res.status(401).json({
                        success: false,
                        message: "User associated with this token no longer exists"
                    });
                }
                
                req.user = user;
                next();
            } catch (err) {
                if (err.name === 'TokenExpiredError') {
                    return res.status(401).json({
                        success: false,
                        message: "Token has expired. Please login again."
                    });
                }
                
                return res.status(401).json({
                    success: false,
                    message: "Invalid authentication token"
                });
            }
        } catch (error) {
            next(error);
        }
    },
    check_authorization: function(roles) {
        return function(req, res, next) {
            if (!req.user || !req.user.role) {
                return res.status(403).json({
                    success: false,
                    message: "Forbidden: User role information is missing"
                });
            }
            
            if (roles.includes(req.user.role.roleName)) {
                next();
            } else {
                return res.status(403).json({
                    success: false,
                    message: "Forbidden: You don't have permission to access this resource"
                });
            }
        }
    }
}