import { Injectable } from "@angular/core";
import { HttpErrorResponse } from "@angular/common/http";
import { throwError, Observable } from "rxjs";

export interface ApiError {
  message: string;
  statusCode: number;
  errors?: string[];
  timestamp: string;
}

@Injectable({
  providedIn: "root",
})
export class HttpErrorHandlerService {
  /**
   * Handle HTTP Error
   *
   * Centralized HTTP error handling with standardized error format
   *
   * @param error - HTTP error response
   * @param context - Context for logging
   * @return Observable error
   */
  handleError(error: HttpErrorResponse, context?: string): Observable<never> {
    const apiError: ApiError = {
      message: this.getErrorMessage(error),
      statusCode: error.status,
      errors: this.getErrors(error),
      timestamp: new Date().toISOString(),
    };

    return throwError(() => apiError);
  }

  /**
   * Get Error Message
   *
   * Extracts user-friendly error message
   *
   * @param error - HTTP error response
   * @return Error message
   */
  private getErrorMessage(error: HttpErrorResponse): string {
    // Client-side or network error
    if (error.error instanceof ErrorEvent) {
      return `Network error: ${error.error.message}`;
    }

    // Server-side error
    if (error.error?.message) {
      return error.error.message;
    }

    // Fallback based on status code
    switch (error.status) {
      case 0:
        return "Unable to connect to server. Please check your connection.";
      case 400:
        return "Invalid request. Please check your input.";
      case 401:
        return "Unauthorized. Please log in again.";
      case 403:
        return "Access denied. You don't have permission.";
      case 404:
        return "Resource not found.";
      case 429:
        return "Too many requests. Please try again later.";
      case 500:
        return "Server error. Please try again later.";
      case 503:
        return "Service unavailable. Please try again later.";
      default:
        return `An error occurred (${error.status})`;
    }
  }

  /**
   * Get Errors
   *
   * Extracts validation errors array
   *
   * @param error - HTTP error response
   * @return Array of error messages
   */
  private getErrors(error: HttpErrorResponse): string[] | undefined {
    if (error.error?.errors && Array.isArray(error.error.errors)) {
      return error.error.errors;
    }
    return undefined;
  }

  /**
   * Is Client Error
   *
   * Checks if error is client-side
   *
   * @param error - API error
   * @return True if client error
   */
  isClientError(error: ApiError): boolean {
    return error.statusCode >= 400 && error.statusCode < 500;
  }

  /**
   * Is Server Error
   *
   * Checks if error is server-side
   *
   * @param error - API error
   * @return True if server error
   */
  isServerError(error: ApiError): boolean {
    return error.statusCode >= 500;
  }

  /**
   * Is Network Error
   *
   * Checks if error is network error
   *
   * @param error - API error
   * @return True if network error
   */
  isNetworkError(error: ApiError): boolean {
    return error.statusCode === 0;
  }
}
