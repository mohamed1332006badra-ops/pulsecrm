import { NextResponse } from "next/server";
import { AppError } from "@/lib/errors";
import { Logger } from "@/lib/observability";

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function handleApiError(error: unknown, requestId?: string) {
  if (error instanceof AppError) {
    Logger.warn(`API Error: ${error.code} - ${error.message}`, {
      errorCode: error.code,
      statusCode: error.statusCode,
      requestId: error.requestId || requestId,
    });

    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          requestId: error.requestId || requestId,
          ...(error.details ? { details: error.details } : {}),
        },
      },
      { status: error.statusCode }
    );
  }

  Logger.error("Unhandled API Server Error", error, { requestId });

  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "An internal server error occurred.",
        requestId,
      },
    },
    { status: 500 }
  );
}
