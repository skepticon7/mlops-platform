from datetime import datetime
from fastapi import Request , FastAPI
from fastapi.responses import JSONResponse
from app.core.exceptions import (
    NotFoundException ,
    BadRequestException,
    UnauthorizedException,
)
from fastapi.exceptions import RequestValidationError

def register_exception_handlers(app : FastAPI):

    @app.exception_handler(BadRequestException)
    async def bad_request_exception_handler(request : Request , exception : BadRequestException):
        return JSONResponse(
            status_code=400,
            content = _body(400 , exception.detail , request)
        )

    @app.exception_handler(NotFoundException)
    async def not_found_exception_handler(request : Request , exception : NotFoundException):
        return JSONResponse(
            status_code = 404,
            content = _body(404 , exception.detail , request)
        )

    @app.exception_handler(UnauthorizedException)
    async def unauthorized_exception_handler(request: Request, exception: UnauthorizedException):
        return JSONResponse(
            status_code=401,
            content=_body(401, exception.detail, request),
            headers=exception.headers,
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request : Request , exception : RequestValidationError):
        return JSONResponse(
            status_code=422,
            content={
                "status": 422,
                "message": "Validation failed",
                "errors": [
                    {
                        "field": " -> ".join(str(l) for l in err["loc"]),
                        "issue": err["msg"]
                    }
                    for err in exception.errors()
                ],
                "path": str(request.url),
                "timestamp": datetime.utcnow().isoformat()
            }
        )


    @app.exception_handler(Exception)
    async def global_exception_handler(request : Request , exception : Exception):
        return JSONResponse(
            status_code=500,
            content=_body(500 , "Internal Server Error" , request)
        )




def _body(status : int , message : str , request : Request) -> dict:
    return {
        "status" : status,
        "message" : message,
        "timestamp": datetime.utcnow().isoformat()
    }
