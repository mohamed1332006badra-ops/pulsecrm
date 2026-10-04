import React from "react";
import { getAuthContext } from "@/lib/auth";
import { getContacts } from "@/services/contacts";
import { canExportData } from "@/lib/authorization";
import { ContactsTable } from "@/components/contacts/contacts-table";

export const dynamic = "force-dynamic";

interface ContactsPageProps {
  searchParams?: {
    page?: string;
    search?: string;
    status?: string;
  };
}

export default async function ContactsPage({ searchParams }: ContactsPageProps) {
  const context = await getAuthContext();
  const page = searchParams?.page ? parseInt(searchParams.page, 10) : 1;
  const search = searchParams?.search || "";
  const status = searchParams?.status || undefined;

  const { data: contacts, pagination } = await getContacts(context, {
    page,
    limit: 25,
    search,
    status,
  });

  const canExport = canExportData(context);

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Contacts & Accounts
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Enterprise customer directory, lead intelligence, and Customer 360 dossiers
        </p>
      </div>

      <ContactsTable
        initialContacts={contacts as any}
        totalCount={pagination.total}
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        canExport={canExport}
      />
    </div>
  );
}
