import { redirect } from "next/navigation";

export default function Billing() {
  redirect("/settings?tab=billing");
}
