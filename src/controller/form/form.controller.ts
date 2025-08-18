import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
const prisma = new PrismaClient();
import z from "zod";

export const getFormStats = async (req: Request, res: Response) => {
  const { userId } = req.params;
  if (!userId?.trim()) {
    res.status(400).json({
      message: "All fields are required !",
    });
    return;
  }

  try {
    const isUserExist = await prisma.user.findUnique({
      where: {
        userId,
      },
    });
    if (!isUserExist) {
      res.status(404).json({
        message: "No users found !",
      });
      return;
    }

    const stats = await prisma.form.aggregate({
      where: {
        userId,
      },
      _sum: {
        visits: true,
        submissions: true,
      },
    });
    if (!stats) {
      res.status(500).json({
        message: "Something went wrong try again",
      });
    }

    const visits = stats._sum.visits || 0;
    const submissions = stats._sum.submissions || 0;

    let submissionRate = 0;

    if (visits > 0) {
      submissionRate = (submissions / visits) * 100;
    }

    const bounceRate = 100 - submissionRate;

    res.status(200).json({
      message: "Statistics fetched successfully",
      data: {
        visits: visits,
        submissions: submissions,
        submissionRate: submissionRate,
        bounceRate: bounceRate,
      },
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({
      message: "Internal server error",
      error: err.message,
    });
  }
};

export const createNewForm = async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      userId: z.string().uuid(),
      name: z.string().min(4, "Name is required and of 4 characters"),
      description: z.string(),
    });
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        message: "Invalid input",
        error: result.error,
      });
      return;
    }

    const { userId, name, description } = result.data;

    const user = await prisma.user.findUnique({
      where: {
        userId,
      },
    });
    if (!user) {
      res.status(404).json({
        message: "No users found !",
      });
    }
    const newForm = await prisma.form.create({
      data: {
        userId,
        name,
        description,
      },
    });

    if (!newForm) {
      res.status(400).json({
        message: "Failed to create form",
      });
      return;
    }
    res.status(200).json({
      message: `${name} Form created successfully`,
      form: newForm,
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({
      message: "Internal server error",
      error: err.message,
    });
  }
};

export const getAllForm = async (req: Request, res: Response) => {
  try {
    const schema = z.object({
      userId: z.string().uuid("User id is required and it must be uuid"),
    });
    const result = schema.safeParse(req.params);
    if (!result.success) {
      res.status(400).json({
        message: "Invalid input",
        error: result.error,
      });
      return;
    }
    const { userId } = result.data;

    const forms = await prisma.form.findMany({
      where: { userId },
      orderBy: {
        createdAt: "desc",
      },
    });
    if (!forms || forms.length === 0) {
      res.status(404).json({
        message: "No forms found",
      });
      return;
    }

    res.status(200).json({
      message: "Forms fetched",
      forms,
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({
      message: "Internal server error",
      error: err.message,
    });
  }
};

export const deleteForm = async (req: Request, res: Response) => {
  const { formid } = req.params;
  const userId = req.user?.id
  if (!formid) {
    res.status(400).json({
      message: "All fields are required",
    });
    return;
  }

  try {
    const form = await prisma.form.findUnique({
      where: {
        id: formid,
        userId
      },
    });
    if (!form) {
      res.status(404).json({
        message: "No form found",
      });
      return
    }
    await prisma.form.delete({
      where: {
        id: formid,
        userId
      },
    })
    res.status(200).json({
      message: `${form?.name} form deleted `,
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({
      message: "Internal server error",
      error: err.message,
    });
  }
};

export const getFormById = async (req: Request, res: Response) => {
  const { userId, formId } = req.params;
  if (!userId?.trim() || !formId?.trim()) {
    res.status(400).json({
      message: "All fields are required",
    });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: {
        userId,
      },
    });
    if (!user) {
      res.status(404).json({
        message: "NO users found",
      });
      return;
    }
    const form = await prisma.form.findUnique({
      where: {
        userId,
        id: formId,
      },
    });
    if (!form) {
      res.status(404).json({
        message: "No form found",
      });
      return;
    }
    res.status(200).json({
      message: `${form.name} form fetched successfully`,
      form: form,
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({
      message: "Internal server error",
      error: err.message,
    });
  }
};

export const updateForm = async (req: Request, res: Response) => {
  const { formId, userId, jsonContent } = req.body;
  if (!formId?.trim() || !userId?.trim() || !jsonContent?.trim()) {
    res.status(400).json({
      message: "All fields are required",
    });
    return;
  }
  try {
    const form = await prisma.form.findUnique({
      where: {
        userId,
        id: formId,
      },
    });
    if (!form) {
      res.status(404).json({
        message: "No forms found",
      });
      return;
    }
    await prisma.form.update({
      where: {
        userId,
        id: formId,
      },
      data: {
        content: jsonContent,
      },
    });
    res.status(200).json({
      message: `${form.name} form updated successfully `,
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({
      message: "Internal server error",
      error: err.message,
    });
  }
};

export const publishForm = async (req: Request, res: Response) => {
  const { userId, formId } = req.body;
  if (!userId?.trim() || !formId?.trim()) {
    res.status(400).json({
      message: "All fields are required",
    });
    return;
  }
  try {
    const form = await prisma.form.findUnique({
      where: {
        userId,
        id: formId,
      },
    });
    if (!form) {
      res.status(404).json({
        message: "No form found",
      });
      return;
    }
    const response = await prisma.form.update({
      where: {
        userId,
        id: formId,
      },
      data: {
        published: true,
      },
    });
    res.status(200).json({
      message: `${form.name}Form published successfully`,
      response,
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({
      message: "Internal server error",
      error: err.message,
    });
  }
};

export const getFormByUrl = async (req: Request, res: Response) => {
  const { formUrl } = req.params;
  if (!formUrl?.trim()) {
    res.status(400).json({
      message: "All fields are required",
    });
  }

  try {
    const formContent = await prisma.form.update({
      where: {
        shareUrl: formUrl,
      },
      data: {
        visits: {
          increment: 1,
        },
      },
      select: {
        content: true,
        userId: true
      },
    });
    if (!formContent) {
      res.status(404).json({
        message: "No content found",
      });
      return;
    }
    res.status(200).json({
      message: "Form content fetched successfully",
      content: formContent
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({
      message: "Internal server error",
      error: err.message,
    });
  }
};



export const submitForm = async (req: Request, res: Response) => {
  const { formUrl, content, userId } = req.body;
  if (!formUrl?.trim() || !content || !userId?.trim()) {
    res.status(400).json({
      messsage: "All fields are required",
    });
    return;
  }
  try {
    const response = await prisma.form.update({
      data: {
        submissions: {
          increment: 1
        },
        formSubmissions: {
          create: {
            content,
            userId,
          },
        }
      },
      where: {
        shareUrl: formUrl
      }
    })
    if (!response) {
      res.status(400).json({
        message: "Failed to submit form"
      });
      return
    }

    res.status(200).json({
      message: `${response.name} form submitted`
    })

  } catch (error) {
    const err = error as Error
    res.status(500).json({
      message: "Internal server error",
      error: err.message
    })
  }
}

export const GetFormWithSubmissions = async (req: Request, res: Response) => {
  const { formId } = req.params
  const userId = req.user?.id

  if (!formId?.trim()) {
    res.status(400).json({
      messsage: "All fields are required",
    });
    return;
  }
  try {
    const response = await prisma.form.findUnique({
      where: {
        id: formId,
        userId
      },
      include: {
        formSubmissions: {
          orderBy: {
            createdAt: "desc"
          }
        }
      }
    })

    if (!response) {
      res.status(400).json({
        message: "No Submission found"
      });
      return
    }

    res.status(200).json({
      message: "Submission table fetched successfully",
      content: response
    })
  } catch (error) {
    const err = error as Error
    res.status(500).json({
      message: "Internal server error",
      error: err.message
    })
  }
}