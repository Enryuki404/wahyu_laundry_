import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Wahyu Laundry",
};

export default function Page() {
  redirect("/login");
}
