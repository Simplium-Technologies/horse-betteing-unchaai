export async function sendSmsOtp(phoneNumber: string, otp: string) {
  const apiKey = process.env.DOVESOFT_API_KEY || process.env.DOVE_SOFT_API_KEY;

  if (!apiKey) {
    console.warn("[SMS] DOVESOFT_API_KEY is not configured in environment variables.");
    return { success: false, error: "API key not configured" };
  }

  const formattedMobile = phoneNumber.startsWith("+91")
    ? phoneNumber
    : phoneNumber.length === 10
    ? `+91${phoneNumber}`
    : phoneNumber;

  const smsText = `Simplium Technologies LLP: Your Unchaai login verification OTP is ${otp}. This OTP is valid for 10 minutes. Do not share it with anyone.\n\n@unchaai.simpliumtechnologies.com #${otp}`;

  try {
    const response = await fetch("https://api.dovesoft.io/api/json/sendsms/", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        key: apiKey,
      },
      body: JSON.stringify({
        listsms: [
          {
            sms: smsText,
            mobiles: formattedMobile,
            senderid: "SIMLLP",
            entityid: "1101225970000079222",
            tempid: "1777178906211778765",
          },
        ],
      }),
    });

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error("[SMS] Error sending OTP via Dovesoft:", error);
    return { success: false, error };
  }
}
