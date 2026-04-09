"use client"

import { type ColumnDef } from "@tanstack/react-table"
import type { TgContact } from "../types"

export const columns: ColumnDef<TgContact>[] = [
  {
    accessorKey: "firstName",
    header: "First Name",
  },
  {
    accessorKey: "lastName",
    header: "Last Name",
  },
  {
    accessorKey: "username",
    header: "TG Handle",
    cell: ({ row }) => {
      const username = row.getValue<string>("username")
      return username ? `@${username}` : "-"
    },
  },
  {
    accessorKey: "company",
    header: "Company",
    cell: ({ row }) => row.getValue<string>("company") || "-",
  },
  {
    accessorKey: "bio",
    header: "Bio",
    cell: ({ row }) => {
      const bio = row.getValue<string | null>("bio")
      if (!bio) return "-"
      return bio.length > 60 ? bio.slice(0, 60) + "…" : bio
    },
  },
  {
    accessorKey: "phone",
    header: "Phone",
    cell: ({ row }) => row.getValue<string>("phone") || "-",
  },
  {
    accessorKey: "lastOnline",
    header: "Last Online",
    cell: ({ row }) => {
      const date = row.getValue<Date | null>("lastOnline")
      return date ? new Date(date).toLocaleDateString() : "Unknown"
    },
  },
  {
    accessorKey: "isContact",
    header: "Contact",
    cell: ({ row }) => (row.getValue<boolean>("isContact") ? "Yes" : "No"),
  },
]
