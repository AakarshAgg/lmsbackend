import AppError from "../utils/error.util.js";
import  jwt  from "jsonwebtoken";


const isLoggedIn=async(req,res,next)=>{
    //extracting token from the cookies
    const {token}=req.cookies;
//if no token send unauthorized message
    if(!token){
        return next(new AppError("Unauthenticated,please login again",401))
    }
//decoding the token using jwt package verify method

    const userDetails=await jwt.verify(token,process.env.JWT_SECRET);

   // If no decode send the message unauthorized
   if (!userDetails) {
    return next(new AppError("Unauthorized, please login to continue", 401));
  }   
// If all good store the id in req object, here we are modifying the request object and adding a custom field user in it

    req.user=userDetails;

      // Do not forget to call the next other wise the flow of execution will not be passed further

    next();
}

// Middleware to check if user has an active subscription or not
const authorizeSubscriber=async(req,res,next)=>{
console.log("user",req.user.role )
console.log("subs",req.user)
    if(req.user.role !=="ADMIN" && req.user.subscription.status !=="active" ){
        return next(
            new AppError("Please subscribe to access this route!",403)
        )
    }
    next()
}


// Middleware to check if user is admin or not
const authorizedRoles=(...roles)=>async(req,res,next)=>{
     const currentUserRoles=req.user.role;
     if(!roles.includes(currentUserRoles)){
        return next(
            new AppError("you do not have permission to access this route",403)
        )
     }
     next()
}

export{
    isLoggedIn,
    authorizedRoles,
    authorizeSubscriber
}