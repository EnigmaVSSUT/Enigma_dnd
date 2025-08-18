require("dotenv").config();
import cors from 'cors'
import express from "express";
const app = express();

app.use(cors())
app.use(express.json())






import authRouter from './routes/auth/auth.routes';
import formRouter from './routes/form/form.routes';





app.use("/api/v1/auth",authRouter);
app.use("/api/v1/form",formRouter);



app.get("/", (req, res) => {
  res.status(200).json({
    info: "Drag and drop form builder api",
    version: "v1",
    dev:"Gyanranjan Patra & Dharmendra Mahanta"
  });
});

app.listen(process.env.PORT || 3000, () => {
  console.log(
    `Server is running at http://localhost:${process.env.PORT || 3000}`
  );
});
