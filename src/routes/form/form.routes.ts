import { Router } from "express";
const formRouter = Router();

import {
  createNewForm,
  deleteForm,
  getAllForm,
  getFormById,
  getFormByUrl,
  getFormStats,
  publishForm,
  submitForm,
  updateForm,
  GetFormWithSubmissions
} from "../../controller/form/form.controller";
import { adminCoordinatorAuthValidation } from "../../middleware/auth/adminCordinator.auth";

formRouter.post("/create", adminCoordinatorAuthValidation, createNewForm);

formRouter.get("/getform/:userId/:formId", getFormById);
formRouter.get("/getFormWithSubmissions/:formId",adminCoordinatorAuthValidation, GetFormWithSubmissions);
formRouter.put("/updateForm", updateForm);

formRouter.delete(
  "/delete/:formid",
  adminCoordinatorAuthValidation,
  deleteForm
);
formRouter.get("/stats/:userId", getFormStats);
formRouter.get("/all/:userId", getAllForm);
formRouter.put("/publish",publishForm);
formRouter.put("/getformbyurl/:formUrl",getFormByUrl)
formRouter.put("/submit",submitForm)

export default formRouter;
