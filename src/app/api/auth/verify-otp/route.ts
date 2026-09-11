import { prisma } from "@/lib/prisma";
import { verifyOtpHash } from "@/lib/otp";
import { createSession } from "@/lib/session";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const phoneNumber = body.phoneNumber?.trim();
    const otp = body.otp?.trim();

    if (!phoneNumber || !otp) {
      return NextResponse.json(
        {
          success: false,
          error: "Phone number and OTP are required",
        },
        { status: 400 }
      );
    }

    if (!/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        {
          success: false,
          error: "OTP must be 6 digits",
        },
        { status: 400 }
      );
    }

    const otpRecord = await prisma.otpVerification.findFirst({
      where: {
        phoneNumber,
        verifiedAt: null,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!otpRecord) {
      return NextResponse.json(
        {
          success: false,
          error: "OTP not found. Please request a new OTP.",
        },
        { status: 400 }
      );
    }

    if (new Date() > otpRecord.expiresAt) {
      await prisma.otpVerification.delete({
        where: {
          id: otpRecord.id,
        },
      });

      return NextResponse.json(
        {
          success: false,
          error: "OTP has expired. Please request a new OTP.",
        },
        { status: 400 }
      );
    }

    const isValid = verifyOtpHash(
      otp,
      otpRecord.otpHash
    );

    if (!isValid) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid OTP",
        },
        { status: 400 }
      );
    }

    // Mark OTP as verified
    await prisma.otpVerification.update({
      where: {
        id: otpRecord.id,
      },
      data: {
        verifiedAt: new Date(),
      },
    });

    // Find existing participant
    let user = await prisma.user.findUnique({
      where: {
        phoneNumber,
      },
    });

    // Create participant if first login
    if (!user) {
      user = await prisma.user.create({
        data: {
          phoneNumber,
          role: "PARTICIPANT",
        },
      });
    }

    await createSession(user.id);

    const isNewUser = user.name === null;

    return NextResponse.json({
      success: true,
      message: "OTP verified successfully",
      isNewUser,
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Verify OTP error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to verify OTP",
      },
      { status: 500 }
    );
  }
}