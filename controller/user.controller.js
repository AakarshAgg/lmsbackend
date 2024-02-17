import User from "../models/user.models.js";
import AppError from "../utils/error.util.js";
import fs from "fs/promises"
import cloudinary from"cloudinary"
import sendEmail from "../utils/sendEmail.js";
import crypto from "crypto"

const cookieOptions={
   maxAge:7*24*60*60*1000,  //7 days
   httpOnly:true,
   secure:true
};

/**
 * @REGISTER
 * @ROUTE @POST {{URL}/api/v1/user/register}
 * @ACCESS Public
 */

const register = async(req,res,next)=>{
//Destructuring the necessary data from the req object
const {fullName,email,password}=req.body

//check if the data is there or not,if not throw error message
if(!fullName || !email || !password){
  return next(new AppError("All fields are required",400))
}

//Check if the user exists with the provided email
const userExists= await User.findOne({email})

//if user exits send the response 
      if(userExists){
        return next(new AppError("Email already exists",409))
      }

 //Create new user with the given necessary data and save to DB     
     const user=await User.create({
        fullName,
        email,
        password,
        avatar:{
            public_id:email,
            secure_url:'https://res.cloudinary.com/du9jzqlpt/image/upload/v1674647316/avatar_drzgxv.jpg',
        }
     })

     //if user not created send message response
     if(!user){
        return next (new AppError("User registration failed,please try again later",400))
     }
   
     // TODO:File upload

     //Run only if user sends a file
     if(req.file){
    //  console.log(req.file)
      try{
         const result = await cloudinary.v2.uploader.upload(req.file.path,{
            folder:"lms",
            width:250,
            height:250,
            gravity:"faces",
            crop:"fill"
         })
     //if success   
         if(result){

          //Set the public_id and secure_url in DB  
            user.avatar.public_id=result.public_id;
            user.avatar.secure_url=result.secure_url;


            //After successful upload remove the file from local storage

            // fs.rm(`uploads/${req.file.filename}`)
            fs.rm(`uploads/${req.file.filename}` )
            }

      }catch(error){
        return next(
         new AppError(error || "File not uploaded,please try again ",500)
        )
      }
     }

     //save the user object
     await user.save();
    
     //Setting the password to undefined so it does not get sent in the response
     user.password=undefined;

     //generating JWT Token
     const token = await user.generateJWTToken()

     //Setting the token in the cookie with name token along with cookieOptions
     res.cookie("token",token,cookieOptions)

     //If all good send the reponse to the frontend
     res.status(201).json({
        success:true,
        message:"User registered successfully",
        user,
     })
    };


/**
 * @LOGIN
 * @ROUTE @POST {{URL}/api/v1/user/login}
 * @ACCESS Public
 */

const login=async(req,res,next)=>{
   
   try {
      const {email,password}=req.body;

 if(!email || !password){
   return next(new AppError("All fields are required",400))
 }

const user = await User.findOne({
   email
}).select("+password")

if(!user || !user.comparePassword(password)){
   return next(new AppError("Email or password does not match",400))
}

const token = await user.generateJWTToken();
user.password=undefined;

res.cookie("token",token,cookieOptions);

res.status(200).json({
   success:true,
   message:"User Loggedin successfully",
   user
})
   } catch (e) {
      return next(new AppError(e.message,500))
   }
 

}

const logout=(req,res)=>{

   res.cookie("token",null,{
      secure:true,
      maxAge:0,
      httpOnly:true
   });

   res.status(200).json({
      success:true,
      message:"User logged out successsfully"
   })
}

const getProfile=async(req,res,next)=>{
    try {
      const userId=req.user.id;
      const user=await User.findById(userId)

      res.status(200).json({
         success:true,
         message:"User details",
         user
      })
    } catch (e) {
      return next (new AppError("Failed to fetch user details",500))
    }
}


const forgotPassword=async(req,res,next)=>{
   const {email}= req.body;

   if(!email){
      return next(new AppError("Email is required",400))
   }

   const user= await User.findOne({email})
   if(!user){
      return next (new AppError("Email not registered",400))
   }

   const resetToken=await user.generatePasswordResetToken()

   await user.save();

   const resetPasswordURL=`${process.env.FRONTEND_URL}/reset-password/${resetToken}`

   const subject="Reset Password"
   const message=`You can reset your password by clicking <a href=${resetPasswordURL} target="_blank">Reset your password</a>\n .If the above link does not work for some reason then copy paste this link in new tab ${resetPasswordURL}.\n If you have no requested this, Kindly ignore`
   try{
      await sendEmail(email,subject,message)

      res.status(200).json({
         success:true,
         message:`Reaset password token has been send to ${email} successfully`
      })
   }catch(e){
       //for security purpose
       user.forgotPasswordExpiry=undefined;
       user.forgotPasswordToken=undefined;

       user.save()

      return next (new AppError(e.message,400))
   }
}

const resetPassword=async(req,res,next)=>{
        const {resetToken}=req.params;
        const {password}=req.body

        const forgotPasswordToken=crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

    const user = await User.findOne({
      forgotPasswordToken,
      forgotPasswordToken:{$gt:Date.now()}
    }) 
    
    if(!user){
      return next(
         new AppError("token is invalid or expired,please try again",400)
      )
    }
        user.password=password;
      user.forgotPasswordToken=undefined;
      user.forgotPasswordExpiry=undefined;

        user.save();

        res.status(200).json({
         success:true,
         message:"Password changed successfully"
        })
}

const changePassword=async(req,res)=>{
   const {oldPassword,newPassword}=req.body;
   const {id}=req.user

   if(!oldPassword || !newPassword){
      return nextTick(
         new AppError("All fields are mandatory",400)
      )
   }

   const user = await User.findById(id).select("+password")
   if(!user){
      return next(
         new AppError("User does not exist",400)
      )
   }
   const isPasswordValid=await user.comparePassword(oldPassword)

   if(!isPasswordValid){
      return next(
         new AppError("Invalid old password",400)
      )
   }

   user.password=newPassword;
   await user.save();

   user.password=undefined

   res.status(200).json({
      success:true,
      message:"Password changed successfully!"
   })
}

const updateUser=async(req,res,next)=>{
   const {fullName}=req.body;
   const {id}=req.params;


   const user=await User.findById(id);

   if(!user){
      return next(
         new AppError("User does not exist",400)
      )
      
   }

   if(fullName){
      user.fullName = fullName
   }
   if(req.file){
      await cloudinary.v2.uploader.destroy(user.avatar.public_id);
      try{
         const result = await cloudinary.v2.uploader.upload(req.file.path,{
            folder:"lms",
            width:250,
            height:250,
            gravity:"faces",
            crop:"fill"
         })
        
         if(result){
            user.avatar.public_id=result.public_id;
            user.avatar.secure_url=result.secure_url;


            //remove file from server

            fs.rm(`uploads/${req.file.filename}`)
         }

      }catch(error){
        return next(
         new AppError(error || "File not uploaded,please try again ",500)
        )
      }
   }

   await user.save();

   res.status(200).json({
      success:true,
      message:"User details updated successfully",
   })
}
export {
    register,
    login,
    logout,
    getProfile,
    forgotPassword,
    resetPassword,
    changePassword,
    updateUser
}