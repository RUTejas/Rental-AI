import { Response } from 'express';

export class ApiResponse {
  static success(
    res: Response,
    data: unknown,
    message = 'Success',
    statusCode = 200
  ): Response {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  static created(res: Response, data: unknown, message = 'Created successfully'): Response {
    return ApiResponse.success(res, data, message, 201);
  }

  static error(
    res: Response,
    message = 'An error occurred',
    statusCode = 500,
    errors?: unknown
  ): Response {
    return res.status(statusCode).json({
      success: false,
      message,
      errors,
      timestamp: new Date().toISOString(),
    });
  }

  static unauthorized(res: Response, message = 'Unauthorized'): Response {
    return ApiResponse.error(res, message, 401);
  }

  static forbidden(res: Response, message = 'Forbidden'): Response {
    return ApiResponse.error(res, message, 403);
  }

  static notFound(res: Response, message = 'Not found'): Response {
    return ApiResponse.error(res, message, 404);
  }

  static badRequest(res: Response, message = 'Bad request', errors?: unknown): Response {
    return ApiResponse.error(res, message, 400, errors);
  }
}
