import { prisma } from "@/lib/prisma";
import { generateOtp, hashOtp } from "@/lib/otp";
import { sendSmsOtp } from "@/lib/sms";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const phoneNumber = body.phoneNumber?.trim();

    if (!phoneNumber) {
      return NextResponse.json(
        {
          success: false,
          error: "Phone number is required",
        },
        { status: 400 }
      );
    }

    // Basic Indian phone number validation
    const phoneRegex = /^[6-9]\d{9}$/;

    if (!phoneRegex.test(phoneNumber)) {
      return NextResponse.json(
        {
          success: false,
          error: "Enter a valid 10-digit Indian phone number",
        },
        { status: 400 }
      );
    }

    const otp = generateOtp();
    const otpHash = hashOtp(otp);

    // Remove previous OTPs for this number
    await prisma.otpVerification.deleteMany({
      where: {
        phoneNumber,
      },
    });

    // OTP valid for 5 minutes
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await prisma.otpVerification.create({
      data: {
        phoneNumber,
        otpHash,
        expiresAt,
      },
    });

    // Send SMS via Dovesoft API
    const smsResult = await sendSmsOtp(phoneNumber, otp);

    // Console log for local dev
    console.log(`OTP for ${phoneNumber}: ${otp}`);

    return NextResponse.json({
      success: true,
      message: "OTP sent successfully",
      smsSent: smsResult.success,
    });
  } catch (error) {
    console.error("Send OTP error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to send OTP",
      },
      { status: 500 }
    );
  }
}