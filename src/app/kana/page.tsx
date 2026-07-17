import { redirect } from "next/navigation";

// The kana chart merged into the stroke ("Yazım") page — keep old links alive.
export default function KanaPage() {
  redirect("/stroke");
}
