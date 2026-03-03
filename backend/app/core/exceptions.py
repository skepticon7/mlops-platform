from fastapi import HTTPException


class NotFoundException(HTTPException):
    def __init__(self , message : str = "Resource Not Found"):
        super().__init__(status_code = 404 , detail = message , )


class BadRequestException(HTTPException):
    def __init__(self , message : str = "Bad Request"):
        super().__init__(status_code = 400 , detail = message)


class UnauthorizedException(HTTPException):
    """Raised when authentication fails (invalid credentials, expired token, etc.)."""

    def __init__(self, message: str = "Invalid authentication credentials"):
        super().__init__(
            status_code=401,
            detail=message,
            # Required by OAuth2 spec for bearer-token endpoints
            headers={"WWW-Authenticate": "Bearer"},
        )
