import { Router } from "express";
import {
    addLectureToCourseById,
  createCourse,
  getAllCourses,
  getLecturesByCourseId,
  removeCourse,
  updateCourse,
  updateCourseById,
  removeLectureFromCourse
} from "../controller/course.controller.js";
import { authorizeSubscriber, authorizedRoles, isLoggedIn } from "../middlewares/auth.middleware.js";
import upload from "../middlewares/multer.middleware.js";

const router = Router();

// router
//   .route("/")
//   .get(getAllCourses)
//   .post(
//     isLoggedIn,
//     authorizedRoles("ADMIN"),
//     upload.single("thumbnail"),
//     createCourse
//   );

// router
//   .route("/:id")
//   .get(isLoggedIn, authorizeSubscriber,getLecturesByCourseId)
//   .put(isLoggedIn, authorizedRoles("ADMIN"), updateCourse)
//   .delete(isLoggedIn, authorizedRoles("ADMIN"), removeCourse)
//   .post(
//     isLoggedIn,
//     authorizedRoles("ADMIN"),
//     upload.single("lecture"),
//     addLectureToCourseById
//   );

// Refactored code
router
  .route('/')
  .get(getAllCourses)
  .post(
    isLoggedIn,
    authorizedRoles('ADMIN'),
    upload.single('thumbnail'),
    createCourse
  )
  .delete(isLoggedIn, authorizedRoles('ADMIN'), removeLectureFromCourse);

router
  .route('/:id')
  .get(isLoggedIn, authorizeSubscriber, getLecturesByCourseId) // Added authorizeSubscribers to check if user is admin or subscribed if not then forbid the access to the lectures
  .put(isLoggedIn, authorizedRoles("ADMIN"), updateCourse)
  .delete(isLoggedIn, authorizedRoles("ADMIN"), removeCourse) 
  .post(
    isLoggedIn,
    authorizedRoles('ADMIN'),
    upload.single('lecture'),
    addLectureToCourseById
  )
  .put(isLoggedIn, authorizedRoles('ADMIN'), updateCourseById);

export default router;
