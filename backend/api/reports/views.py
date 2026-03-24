import json
import base64

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from .email_service import send_report_email


@csrf_exempt  # remove later if using proper auth
def send_report(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            charts = data.get("charts", {}) # Receives request from frontend

            decoded_charts = {}

            # Decode ALL charts
            for key, base64_string in charts.items(): # Loops through all charts then converts base64 → bytes (PDF-ready)
                if base64_string:
                    try:
                        # Remove "data:image/png;base64,"
                        if ";base64," in base64_string:
                            header, imgstr = base64_string.split(";base64,")
                        else:
                            return JsonResponse({"error": "Invalid image format"}, status=400)
                        
                        for key, base64_string in charts.items():
                            try:
                                header, imgstr = base64_string.split(";base64,")
                                decoded_charts[key] = base64.b64decode(imgstr)
                            except Exception as e:
                                print(f"Skipping {key}: {e}")
                    except Exception as e:
                        print(f"Error decoding {key}: {e}")

            # Send to email service
            send_report_email(
                to_email=request.user.email,  # Assuming user is authenticated and has email
                charts=decoded_charts
            )

            return JsonResponse({
                "status": "success",
                "charts_received": list(decoded_charts.keys())
            })

        except Exception as e:
            return JsonResponse({
                "status": "error",
                "message": str(e)
            }, status=500)

    return JsonResponse({"message": "Only POST allowed"}, status=405)