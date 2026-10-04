import { db, schema } from "@/lib/db";
import { hashSecret } from "@/lib/security";
import { calculateLeadScore } from "@/services/lead-scoring";

export async function seedDatabase() {
  console.log("Starting PulseCRM Database Seed...");

  // 1. CLEAR EXISTING DATA (In dependency order)
  try {
    await db.delete(schema.tasks);
    await db.delete(schema.activities);
    await db.delete(schema.deals);
    await db.delete(schema.contacts);
    await db.delete(schema.api_keys);
    await db.delete(schema.webhook_events);
    await db.delete(schema.ai_usage);
    await db.delete(schema.pipeline_stages);
    await db.delete(schema.organization_members);
    await db.delete(schema.profiles);
    await db.delete(schema.organizations);
  } catch (err) {
    console.log("Note: Some tables might not exist yet or are clean.");
  }

  // 2. CREATE ORGANIZATIONS
  const orgApexId = "11111111-1111-1111-1111-111111111111";
  const orgHorizonId = "22222222-2222-2222-2222-222222222222";

  await db.insert(schema.organizations).values([
    {
      id: orgApexId,
      name: "Apex Industrial Supplies",
      slug: "apex-industrial",
    },
    {
      id: orgHorizonId,
      name: "Horizon Logistics",
      slug: "horizon-logistics",
    },
  ]);

  // 3. CREATE PROFILES & MEMBERSHIPS
  // Apex Users
  const userKarimId = "00000000-0000-0000-0000-000000000001";
  const userNadiaId = "00000000-0000-0000-0000-000000000002";
  const userOmarId = "00000000-0000-0000-0000-000000000003";
  const userLailaId = "00000000-0000-0000-0000-000000000004";
  const userTarekId = "00000000-0000-0000-0000-000000000005";

  // Horizon Users
  const userZiadId = "00000000-0000-0000-0000-000000000006";
  const userSarahId = "00000000-0000-0000-0000-000000000007";

  const allProfiles = [
    {
      id: userKarimId,
      organization_id: orgApexId,
      full_name: "Karim Al-Mansoor",
      email: "karim@apexsupplies.com",
      role: "owner" as const,
      avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
    },
    {
      id: userNadiaId,
      organization_id: orgApexId,
      full_name: "Nadia El-Sayed",
      email: "nadia@apexsupplies.com",
      role: "admin" as const,
      avatar_url: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop",
    },
    {
      id: userOmarId,
      organization_id: orgApexId,
      full_name: "Omar Farooq",
      email: "omar@apexsupplies.com",
      role: "sales_rep" as const,
      avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
      last_lead_assigned_at: new Date(Date.now() - 3600000 * 4),
    },
    {
      id: userLailaId,
      organization_id: orgApexId,
      full_name: "Laila Mahmoud",
      email: "laila@apexsupplies.com",
      role: "sales_rep" as const,
      avatar_url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop",
      last_lead_assigned_at: new Date(Date.now() - 3600000 * 8),
    },
    {
      id: userTarekId,
      organization_id: orgApexId,
      full_name: "Tarek Mostafa",
      email: "tarek@apexsupplies.com",
      role: "viewer" as const,
      avatar_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
    },
    {
      id: userZiadId,
      organization_id: orgHorizonId,
      full_name: "Ziad Al-Hassan",
      email: "ziad@horizonlogistics.com",
      role: "owner" as const,
    },
    {
      id: userSarahId,
      organization_id: orgHorizonId,
      full_name: "Sarah Nabil",
      email: "sarah@horizonlogistics.com",
      role: "sales_rep" as const,
    },
  ];

  await db.insert(schema.profiles).values(allProfiles);

  // Memberships
  await db.insert(schema.organization_members).values([
    { organization_id: orgApexId, user_id: userKarimId, role: "owner", status: "active" },
    { organization_id: orgApexId, user_id: userNadiaId, role: "admin", status: "active" },
    { organization_id: orgApexId, user_id: userOmarId, role: "sales_rep", status: "active" },
    { organization_id: orgApexId, user_id: userLailaId, role: "sales_rep", status: "active" },
    { organization_id: orgApexId, user_id: userTarekId, role: "viewer", status: "active" },
    { organization_id: orgHorizonId, user_id: userZiadId, role: "owner", status: "active" },
    { organization_id: orgHorizonId, user_id: userSarahId, role: "sales_rep", status: "active" },
  ]);

  // 4. CREATE PIPELINE STAGES
  const stagesApex = [
    { id: "33333333-3333-3333-3333-000000000001", organization_id: orgApexId, name: "Lead In", key: "lead_in", position: 1, is_won: false, is_lost: false },
    { id: "33333333-3333-3333-3333-000000000002", organization_id: orgApexId, name: "Contacted", key: "contacted", position: 2, is_won: false, is_lost: false },
    { id: "33333333-3333-3333-3333-000000000003", organization_id: orgApexId, name: "Proposal Sent", key: "proposal_sent", position: 3, is_won: false, is_lost: false },
    { id: "33333333-3333-3333-3333-000000000004", organization_id: orgApexId, name: "Negotiation", key: "negotiation", position: 4, is_won: false, is_lost: false },
    { id: "33333333-3333-3333-3333-000000000005", organization_id: orgApexId, name: "Won", key: "won", position: 5, is_won: true, is_lost: false },
    { id: "33333333-3333-3333-3333-000000000006", organization_id: orgApexId, name: "Lost", key: "lost", position: 6, is_won: false, is_lost: true },
  ];

  const stagesHorizon = [
    { id: "33333333-3333-3333-3333-000000000007", organization_id: orgHorizonId, name: "Inquiry", key: "inquiry", position: 1, is_won: false, is_lost: false },
    { id: "33333333-3333-3333-3333-000000000008", organization_id: orgHorizonId, name: "Quoted", key: "quoted", position: 2, is_won: false, is_lost: false },
    { id: "33333333-3333-3333-3333-000000000009", organization_id: orgHorizonId, name: "Closed Won", key: "won", position: 3, is_won: true, is_lost: false },
  ];

  await db.insert(schema.pipeline_stages).values([...stagesApex, ...stagesHorizon]);

  // 5. CREATE API KEYS
  // Seed a known test key for Apex Industrial Supplies:
  // Raw Secret: "pk_live_apex_crm_demo_key_9999"
  // Prefix: "pk_live_apex_crm" (first 16 chars)
  const testRawSecret = "pk_live_apex_crm_demo_key_9999";
  const testKeyPrefix = testRawSecret.slice(0, 16);
  const testKeyHash = hashSecret(testRawSecret);

  await db.insert(schema.api_keys).values([
    {
      id: "44444444-4444-4444-4444-000000000001",
      organization_id: orgApexId,
      name: "Production Webhook Ingestion",
      key_prefix: testKeyPrefix,
      key_hash: testKeyHash,
      created_by: userKarimId,
      expires_at: new Date(Date.now() + 90 * 24 * 3600 * 1000),
    },
    {
      id: "44444444-4444-4444-4444-000000000002",
      organization_id: orgHorizonId,
      name: "Horizon ERP Sync Key",
      key_prefix: "pk_live_horizon_",
      key_hash: hashSecret("pk_live_horizon_secret_sample"),
      created_by: userZiadId,
    },
  ]);

  // 6. CREATE REALISTIC B2B CONTACTS (Apex Industrial Supplies)
  const rawContacts = [
    { name: "Ahmed Soliman", email: "a.soliman@cairoheavy.com", phone: "+20 100 456 7890", company: "Cairo Heavy Equipment", status: "customer" as const, value: 125000, repId: userOmarId, source: "website" },
    { name: "Mona El-Gammal", email: "mona@nilevalves.eg", phone: "+20 102 334 5566", company: "Nile Industrial Valves", status: "qualified" as const, value: 48000, repId: userLailaId, source: "meta_ads" },
    { name: "Hassan Al-Hajri", email: "hassan.hajri@gulfpetro.com", phone: "+971 50 123 4567", company: "Gulf Petrochemical Corp", status: "qualified" as const, value: 210000, repId: userOmarId, source: "landing_page" },
    { name: "Samiha Abdelaziz", email: "s.abdelaziz@alexsteelworks.com", phone: "+20 122 889 0011", company: "Alexandria Steel Works", status: "contacted" as const, value: 65000, repId: userLailaId, source: "google_ads" },
    { name: "Youssef Qasim", email: "youssef@deltapumps.net", phone: "+20 111 998 7766", company: "Delta Pumps & Turbines", status: "new" as const, value: 18500, repId: userOmarId, source: "website" },
    { name: "Farah Al-Khatib", email: "farah@redseamarine.com", phone: "+20 106 778 8990", company: "Red Sea Marine Engineering", status: "customer" as const, value: 92000, repId: userLailaId, source: "referral" },
    { name: "Khaled Mansour", email: "khaled@suezlogistics.eg", phone: "+20 109 223 3445", company: "Suez Logistics Hub", status: "contacted" as const, value: 34000, repId: userOmarId, source: "website" },
    { name: "Dina Fathy", email: "dina@arabianbearings.com", phone: "+966 54 876 5432", company: "Arabian Bearings Ltd", status: "qualified" as const, value: 54000, repId: userLailaId, source: "meta_ads" },
    { name: "Tariq Barakat", email: "tariq@gizaheavymachinery.com", phone: "+20 120 445 6677", company: "Giza Heavy Machinery", status: "customer" as const, value: 180000, repId: userOmarId, source: "manual" },
    { name: "Reem Al-Sabah", email: "reem.sabah@kuwaitfoundry.com", phone: "+965 99 887 766", company: "Kuwait Foundry Group", status: "unqualified" as const, value: 9000, repId: userLailaId, source: "google_ads" },
    { name: "Amr Wahba", email: "amr@helwanchemicals.com", phone: "+20 101 223 3445", company: "Helwan Chemicals & Fertilizers", status: "qualified" as const, value: 78000, repId: userOmarId, source: "website" },
    { name: "Salma Roushdy", email: "salma@cairopipes.com", phone: "+20 114 556 6778", company: "Cairo Pipeline Solutions", status: "contacted" as const, value: 42000, repId: userLailaId, source: "website" },
    { name: "Mahmoud Zaher", email: "zaher@mansouratools.com", phone: "+20 100 889 9001", company: "Mansoura Precision Tools", status: "new" as const, value: 15000, repId: userOmarId, source: "landing_page" },
    { name: "Hoda Ezzat", email: "hoda@aswanquarries.com", phone: "+20 109 443 2211", company: "Aswan Quarries & Mining", status: "customer" as const, value: 140000, repId: userLailaId, source: "manual" },
    { name: "Ibrahim Darwish", email: "i.darwish@tantaelectric.eg", phone: "+20 122 334 4556", company: "Tanta Electric Transformers", status: "contacted" as const, value: 31000, repId: userOmarId, source: "google_ads" },
    { name: "Nour Al-Jamil", email: "nour@middleeastvalves.com", phone: "+971 52 443 2211", company: "Middle East Valve Systems", status: "qualified" as const, value: 89000, repId: userLailaId, source: "meta_ads" },
    { name: "Bassem Fawzy", email: "bassem@zagazigsteel.com", phone: "+20 106 112 2334", company: "Zagazig Structural Steel", status: "new" as const, value: 24000, repId: userOmarId, source: "website" },
    { name: "Mariam Sherif", email: "mariam@suezcanalhydraulics.com", phone: "+20 100 998 8776", company: "Suez Canal Hydraulics", status: "customer" as const, value: 165000, repId: userLailaId, source: "referral" },
    { name: "Sherif Osman", email: "sherif.osman@deltafilters.net", phone: "+20 111 445 5667", company: "Delta Filtration Systems", status: "contacted" as const, value: 27500, repId: userOmarId, source: "google_ads" },
    { name: "Layla Younis", email: "layla@pyramidconveyors.com", phone: "+20 102 778 8990", company: "Pyramids Conveyor Belts", status: "qualified" as const, value: 72000, repId: userLailaId, source: "website" },
    { name: "Adel Metwally", email: "adel@portsaidmarine.eg", phone: "+20 128 334 5566", company: "Port Said Marine Supply", status: "new" as const, value: 19000, repId: userOmarId, source: "meta_ads" },
  ];

  const contactRecords = [];
  const dealRecords = [];
  const activityRecords = [];
  const taskRecords = [];

  // Stage IDs lookup for Apex
  const [sLeadIn, sContacted, sProposal, sNegotiation, sWon, sLost] = stagesApex.map(s => s.id);
  const stagesCycle = [sWon, sProposal, sNegotiation, sContacted, sLeadIn, sWon, sNegotiation, sProposal, sWon, sLost, sNegotiation, sContacted, sLeadIn, sWon, sProposal, sNegotiation, sLeadIn, sWon, sContacted, sProposal, sLeadIn];

  for (let i = 0; i < rawContacts.length; i++) {
    const raw = rawContacts[i];
    const contactId = `55555555-5555-5555-5555-${String(i + 1).padStart(12, "0")}`;
    const dealId = `66666666-6666-6666-6666-${String(i + 1).padStart(12, "0")}`;
    const targetStageId = stagesCycle[i % stagesCycle.length];

    const scoreResult = calculateLeadScore({
      email: raw.email,
      phone: raw.phone,
      companyName: raw.company,
      estimatedValue: raw.value,
      source: raw.source,
    });

    // Make some deals stalled (created 20 days ago, last activity 18 days ago)
    const isStalledCandidate = i === 2 || i === 7 || i === 11;
    const createdAt = isStalledCandidate
      ? new Date(Date.now() - 25 * 24 * 3600 * 1000)
      : new Date(Date.now() - (i + 1) * 24 * 3600 * 1000 * 0.8);

    contactRecords.push({
      id: contactId,
      organization_id: orgApexId,
      assigned_to_id: raw.repId,
      name: raw.name,
      email: raw.email,
      phone: raw.phone,
      company_name: raw.company,
      status: raw.status,
      lead_score: scoreResult.score,
      source: raw.source,
      created_at: createdAt,
      updated_at: createdAt,
    });

    dealRecords.push({
      id: dealId,
      organization_id: orgApexId,
      contact_id: contactId,
      assigned_to_id: raw.repId,
      pipeline_stage_id: targetStageId,
      title: `${raw.company} - Supply Agreement`,
      value: String(raw.value),
      currency: "USD",
      expected_close_date: new Date(Date.now() + (30 - i) * 24 * 3600 * 1000),
      created_at: createdAt,
      updated_at: createdAt,
    });

    // Initial activity
    activityRecords.push({
      id: `77777777-7777-7777-7777-${String(i + 1).padStart(12, "0")}`,
      organization_id: orgApexId,
      contact_id: contactId,
      deal_id: dealId,
      user_id: raw.repId,
      type: "lead_ingested" as const,
      title: "Inbound Lead Qualified",
      description: `Initial qualification completed for ${raw.company}. High purchase intent detected.`,
      metadata: { leadScore: scoreResult.score, initialValue: raw.value },
      created_at: createdAt,
    });

    if (!isStalledCandidate) {
      // Recent follow-up activity
      activityRecords.push({
        id: `77777777-7777-7777-8888-${String(i + 1).padStart(12, "0")}`,
        organization_id: orgApexId,
        contact_id: contactId,
        deal_id: dealId,
        user_id: raw.repId,
        type: "call" as const,
        title: "Technical Discovery Call",
        description: `Reviewed technical specifications and compliance requirements with ${raw.name}.`,
        metadata: { durationMinutes: 30, outcome: "positive" },
        created_at: new Date(Date.now() - (i % 5 + 1) * 24 * 3600 * 1000),
      });
    }

    // Task for active deals
    if (i < 10) {
      taskRecords.push({
        id: `88888888-8888-8888-8888-${String(i + 1).padStart(12, "0")}`,
        organization_id: orgApexId,
        contact_id: contactId,
        deal_id: dealId,
        assigned_to_id: raw.repId,
        title: `Follow up on contract terms with ${raw.company}`,
        description: "Verify payment schedule and standard warranty terms before final sign-off.",
        due_date: new Date(Date.now() + (i + 2) * 24 * 3600 * 1000),
        priority: i % 2 === 0 ? "high" as const : "medium" as const,
        status: "pending" as const,
        created_by: userKarimId,
      });
    }
  }

  // Insert Apex records
  await db.insert(schema.contacts).values(contactRecords);
  await db.insert(schema.deals).values(dealRecords);
  await db.insert(schema.activities).values(activityRecords);
  await db.insert(schema.tasks).values(taskRecords);

  // 7. CREATE CONTACTS & DEALS FOR HORIZON LOGISTICS (Proves Multi-Tenant Isolation)
  const contactHorizon = {
    id: "55555555-5555-5555-9999-000000000001",
    organization_id: orgHorizonId,
    assigned_to_id: userSarahId,
    name: "Tariq Al-Nuaimi",
    email: "tariq@dubaicargo.ae",
    phone: "+971 4 888 9900",
    company_name: "Dubai International Cargo Hub",
    status: "qualified" as const,
    lead_score: 85,
    source: "website",
  };
  await db.insert(schema.contacts).values([contactHorizon]);

  await db.insert(schema.deals).values([
    {
      id: "66666666-6666-6666-9999-000000000001",
      organization_id: orgHorizonId,
      contact_id: contactHorizon.id,
      assigned_to_id: userSarahId,
      pipeline_stage_id: stagesHorizon[0].id,
      title: "Dubai Cargo Freight Forwarding Master Contract",
      value: "350000",
      currency: "AED",
    },
  ]);

  console.log("PulseCRM Database Seed Completed Successfully!");
  console.log("Seeded Organizations: 2 (Apex Industrial Supplies & Horizon Logistics)");
  console.log(`Seeded Apex Contacts: ${contactRecords.length}, Deals: ${dealRecords.length}`);
  console.log(`Demo API Key: ${testRawSecret}`);
}

// Execute if run directly via tsx
if (require.main === module || process.argv[1]?.includes("seed.ts")) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Seed failed:", err);
      process.exit(1);
    });
}
