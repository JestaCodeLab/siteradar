import { redirect } from "next/navigation";

export default function Audit() {
  redirect("/admin/activity?tab=admin");
}
