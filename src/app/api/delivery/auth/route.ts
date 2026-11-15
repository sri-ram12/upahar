import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const RUNTIME_FALLBACK_SECRET = crypto.randomBytes(32).toString("hex");
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === "production" ? RUNTIME_FALLBACK_SECRET : "upahar_delivery_dev_key_2026");
const DELIVERY_COOKIE_NAME = "upahar_delivery_token";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(DELIVERY_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ authenticated: false, agent: null });
    }

    const payload = jwt.verify(token, JWT_SECRET) as { id?: string };
    if (!payload?.id) {
      return NextResponse.json({ authenticated: false, agent: null });
    }

    const agent = await prisma.deliveryAgent.findUnique({
      where: { id: payload.id },
      select: {
        id: true,
        name: true,
        phone: true,
        vehicleNumber: true,
        status: true,
        approvalStatus: true,
        isActive: true,
        totalDeliveries: true,
        cashInHand: true,
        totalEarnings: true,
      },
    });

    if (!agent || !agent.isActive || agent.approvalStatus !== "APPROVED") {
      const res = NextResponse.json(
        {
          authenticated: false,
          agent: null,
          error: !agent
            ? "Rider profile not found."
            : agent.approvalStatus !== "APPROVED"
            ? "Your rider account is not currently approved."
            : "Your rider account is currently paused by Admin.",
        },
        { status: 403 }
      );
      res.cookies.set(DELIVERY_COOKIE_NAME, "", {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });
      return res;
    }

    return NextResponse.json({ authenticated: true, agent });
  } catch {
    return NextResponse.json({ authenticated: false, agent: null });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(DELIVERY_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);
    const rl = rateLimit(clientIp, {
      intervalMs: 5 * 60 * 1000,
      maxRequests: 5,
      prefix: "rider_login",
    });

    if (!rl.success) {
      return NextResponse.json(
        { error: `Too many login attempts. Please wait ${rl.resetSeconds} seconds before trying again.` },
        { status: 429, headers: { "Retry-After": String(rl.resetSeconds) } }
      );
    }

    const body = await req.json();
    const { phone, pin } = body;

    const cleanPhone = phone ? phone.replace(/\D/g, "") : "";
    if (!cleanPhone || cleanPhone.length < 10) {
      return NextResponse.json(
        { error: "Please enter your 10-digit mobile number" },
        { status: 400 }
      );
    }

    if (!pin) {
      return NextResponse.json(
        { error: "Please enter your Rider Secret PIN" },
        { status: 400 }
      );
    }

    const agent = await prisma.deliveryAgent.findUnique({
      where: { phone: cleanPhone },
    });

    if (!agent) {
      return NextResponse.json(
        {
          error:
            "Access Denied: No delivery agent registered with this number. Please ask the Admin to add you in the Owner Portal first.",
        },
        { status: 403 }
      );
    }

    if (agent.approvalStatus === "PENDING_APPROVAL") {
      return NextResponse.json(
        {
          error:
            "Approval Pending: Your delivery boy application has been submitted. Ask Admin to approve your account in Owner Portal.",
        },
        { status: 403 }
      );
    }

    if (agent.approvalStatus === "REJECTED") {
      return NextResponse.json(
        { error: "Access Denied: Your delivery boy application was not approved." },
        { status: 403 }
      );
    }

    if (!agent.isActive) {
      return NextResponse.json(
        {
          error:
            "Your rider account is currently INACTIVE. Please contact the Admin to activate your delivery access.",
        },
        { status: 403 }
      );
    }

    const isValid = await bcrypt.compare(String(pin), agent.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Incorrect Rider PIN. Please check and try again." },
        { status: 401 }
      );
    }

    const token = jwt.sign(
      {
        id: agent.id,
        name: agent.name,
        phone: agent.phone,
        vehicleNumber: agent.vehicleNumber,
        role: "DELIVERY_AGENT",
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    const response = NextResponse.json({
      success: true,
      message: `Welcome, ${agent.name}! Rider console unlocked.`,
      agent: {
        id: agent.id,
        name: agent.name,
        phone: agent.phone,
        vehicleNumber: agent.vehicleNumber,
        status: agent.status,
        approvalStatus: agent.approvalStatus,
        totalDeliveries: agent.totalDeliveries,
        cashInHand: agent.cashInHand,
        totalEarnings: agent.totalEarnings,
      },
      token,
    });

    response.cookies.set(DELIVERY_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    console.error("Delivery auth error:", error);
    return NextResponse.json(
      { error: "Login failed: " + (error?.message || "Unknown error") },
      { status: 500 }
    );
  }
}
