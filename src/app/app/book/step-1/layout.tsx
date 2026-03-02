"use client";

import React from "react";
import BookingProvider from "@/components/app/BookingProvider";

export default function Step1Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <BookingProvider>{children}</BookingProvider>;
}
