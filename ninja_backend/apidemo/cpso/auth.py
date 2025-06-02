from ninja.security import HttpBearer

import jwt
from django.conf import settings
from django.contrib.auth.models import User


# create authentication class
class GlobalAuth(HttpBearer):
    def authenticate(self, request, token):
        try:
            # Decode the JWT token
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=["HS256"],
                options={"require_exp": True},
            )
            user_id = payload.get("user_id")
            if not user_id:
                return None

            user = User.objects.get(id=user_id)
            return user
        except User.DoesNotExist:
            print("User does not exist")
            return None
        except jwt.ExpiredSignatureError:
            print("Token has expired")
            return None
        except jwt.DecodeError:
            print("Token decode error")
            return None

        # except (jwt.ExpiredSignatureError, jwt.DecodeError, User.DoesNotExist):
        # return None
