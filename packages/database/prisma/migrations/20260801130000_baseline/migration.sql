-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ADMIN', 'AGENT');

-- CreateEnum
CREATE TYPE "ChatChannel" AS ENUM ('KAKAO', 'LINE', 'NAVER_TALK', 'WECHAT', 'WHATSAPP', 'INSTAGRAM');

-- CreateEnum
CREATE TYPE "ChannelStatus" AS ENUM ('DISCONNECTED', 'CONFIGURING', 'CONNECTED', 'ERROR');

-- CreateEnum
CREATE TYPE "PatientChannelLinkMethod" AS ENUM ('AUTO', 'MANUAL');

-- CreateEnum
CREATE TYPE "PatientTagCategory" AS ENUM ('TREATMENT', 'STATUS', 'SOURCE');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "MessageSender" AS ENUM ('CUSTOMER', 'STAFF', 'AI', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ChatCoachGenerationStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "AutoResponseGenerationStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "translationContextEnabled" BOOLEAN NOT NULL DEFAULT true,
    "translationContextMessageCount" INTEGER NOT NULL DEFAULT 10,
    "chatCoachContextEnabled" BOOLEAN NOT NULL DEFAULT true,
    "chatCoachContextMessageCount" INTEGER NOT NULL DEFAULT 10,
    "autoResponseContextEnabled" BOOLEAN NOT NULL DEFAULT true,
    "autoResponseContextMessageCount" INTEGER NOT NULL DEFAULT 10,
    "autoResponseDelayMinutes" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'AGENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthUser" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "username" TEXT,
    "displayUsername" TEXT,
    "organizationId" TEXT,
    "role" TEXT NOT NULL DEFAULT 'AGENT',

    CONSTRAINT "AuthUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthSession" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthAccount" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthVerification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelConnection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "channel" "ChatChannel" NOT NULL,
    "status" "ChannelStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "displayName" TEXT,
    "externalAccountId" TEXT,
    "credentialsEncrypted" TEXT,
    "webhookToken" TEXT NOT NULL,
    "connectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChannelConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "externalRef" TEXT,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "phoneNormalized" TEXT,
    "email" TEXT,
    "gender" TEXT,
    "birthDate" TIMESTAMP(3),
    "language" TEXT NOT NULL DEFAULT 'ko',
    "visitType" TEXT,
    "nationality" TEXT,
    "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "managementNotes" TEXT,
    "notesUpdatedAt" TIMESTAMP(3),
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientChannel" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "patientId" TEXT,
    "channel" "ChatChannel" NOT NULL,
    "externalCustomerId" TEXT NOT NULL,
    "displayName" TEXT,
    "phone" TEXT,
    "phoneNormalized" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "linkMethod" "PatientChannelLinkMethod",
    "linkedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientTag" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#3157F6',
    "category" "PatientTagCategory" NOT NULL DEFAULT 'TREATMENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientTagAssignment" (
    "patientId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientTagAssignment_pkey" PRIMARY KEY ("patientId","tagId")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT,
    "patientChannelId" TEXT,
    "channel" "ChatChannel" NOT NULL,
    "externalThreadId" TEXT,
    "status" "ConversationStatus" NOT NULL DEFAULT 'OPEN',
    "important" BOOLEAN NOT NULL DEFAULT false,
    "autoRespondEnabled" BOOLEAN NOT NULL DEFAULT false,
    "autoTranslateEnabled" BOOLEAN NOT NULL DEFAULT true,
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationAssignee" (
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationAssignee_pkey" PRIMARY KEY ("conversationId","userId")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "externalMessageId" TEXT,
    "direction" "MessageDirection" NOT NULL,
    "sender" "MessageSender" NOT NULL,
    "content" TEXT NOT NULL,
    "sourceLanguage" TEXT NOT NULL DEFAULT '',
    "sourceLanguageName" TEXT NOT NULL DEFAULT '',
    "translatedContent" TEXT NOT NULL DEFAULT '',
    "translatedLanguage" TEXT NOT NULL DEFAULT '',
    "translatedLanguageName" TEXT NOT NULL DEFAULT '',
    "bookmarkedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatCoachGeneration" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "sourceMessageId" TEXT NOT NULL,
    "requestedById" TEXT,
    "model" TEXT NOT NULL,
    "status" "ChatCoachGenerationStatus" NOT NULL DEFAULT 'PENDING',
    "sourceSnapshot" TEXT NOT NULL,
    "treatmentTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "knowledgeDocumentIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sources" JSONB,
    "responseGuide" TEXT,
    "answerExample" TEXT,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "totalTokens" INTEGER,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatCoachGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutoResponseGeneration" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "sourceMessageId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "status" "AutoResponseGenerationStatus" NOT NULL DEFAULT 'PENDING',
    "sourceSnapshot" TEXT NOT NULL,
    "contextMessageCount" INTEGER NOT NULL DEFAULT 0,
    "treatmentTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "knowledgeDocumentIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sources" JSONB,
    "generatedContent" TEXT,
    "deliveredContent" TEXT,
    "translatedLanguage" TEXT NOT NULL DEFAULT 'ko',
    "translatedLanguageName" TEXT NOT NULL DEFAULT '한국어',
    "externalMessageId" TEXT,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "totalTokens" INTEGER,
    "attemptCount" INTEGER NOT NULL DEFAULT 1,
    "errorMessage" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutoResponseGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "doctorName" TEXT NOT NULL,
    "treatment" TEXT,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManualFolder" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManualFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManualDocument" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "folderId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "contentMarkdown" TEXT NOT NULL,
    "cautionMarkdown" TEXT NOT NULL DEFAULT '',
    "cautionEnabled" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManualDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManualDocumentImage" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "publicUrl" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "altText" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManualDocumentImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManualTag" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#8066EC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManualTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManualDocumentTag" (
    "documentId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ManualDocumentTag_pkey" PRIMARY KEY ("documentId","tagId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "AuthUser_email_key" ON "AuthUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AuthUser_username_key" ON "AuthUser"("username");

-- CreateIndex
CREATE INDEX "AuthUser_organizationId_idx" ON "AuthUser"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthSession_token_key" ON "AuthSession"("token");

-- CreateIndex
CREATE INDEX "AuthSession_userId_idx" ON "AuthSession"("userId");

-- CreateIndex
CREATE INDEX "AuthAccount_userId_idx" ON "AuthAccount"("userId");

-- CreateIndex
CREATE INDEX "AuthVerification_identifier_idx" ON "AuthVerification"("identifier");

-- CreateIndex
CREATE INDEX "ChannelConnection_organizationId_status_idx" ON "ChannelConnection"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelConnection_organizationId_channel_key" ON "ChannelConnection"("organizationId", "channel");

-- CreateIndex
CREATE INDEX "Customer_organizationId_name_idx" ON "Customer"("organizationId", "name");

-- CreateIndex
CREATE INDEX "Customer_organizationId_phoneNormalized_idx" ON "Customer"("organizationId", "phoneNormalized");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_organizationId_externalRef_key" ON "Customer"("organizationId", "externalRef");

-- CreateIndex
CREATE INDEX "PatientChannel_hospitalId_phoneNormalized_idx" ON "PatientChannel"("hospitalId", "phoneNormalized");

-- CreateIndex
CREATE INDEX "PatientChannel_patientId_channel_idx" ON "PatientChannel"("patientId", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "PatientChannel_hospitalId_channel_externalCustomerId_key" ON "PatientChannel"("hospitalId", "channel", "externalCustomerId");

-- CreateIndex
CREATE INDEX "PatientTag_hospitalId_category_idx" ON "PatientTag"("hospitalId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "PatientTag_hospitalId_name_key" ON "PatientTag"("hospitalId", "name");

-- CreateIndex
CREATE INDEX "PatientTagAssignment_tagId_idx" ON "PatientTagAssignment"("tagId");

-- CreateIndex
CREATE INDEX "Conversation_organizationId_status_lastMessageAt_idx" ON "Conversation"("organizationId", "status", "lastMessageAt");

-- CreateIndex
CREATE INDEX "Conversation_customerId_idx" ON "Conversation"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_organizationId_channel_externalThreadId_key" ON "Conversation"("organizationId", "channel", "externalThreadId");

-- CreateIndex
CREATE INDEX "ConversationAssignee_userId_idx" ON "ConversationAssignee"("userId");

-- CreateIndex
CREATE INDEX "Message_conversationId_sentAt_idx" ON "Message"("conversationId", "sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "Message_conversationId_externalMessageId_key" ON "Message"("conversationId", "externalMessageId");

-- CreateIndex
CREATE INDEX "ChatCoachGeneration_hospitalId_createdAt_idx" ON "ChatCoachGeneration"("hospitalId", "createdAt");

-- CreateIndex
CREATE INDEX "ChatCoachGeneration_conversationId_createdAt_idx" ON "ChatCoachGeneration"("conversationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChatCoachGeneration_conversationId_sourceMessageId_key" ON "ChatCoachGeneration"("conversationId", "sourceMessageId");

-- CreateIndex
CREATE INDEX "AutoResponseGeneration_hospitalId_status_updatedAt_idx" ON "AutoResponseGeneration"("hospitalId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "AutoResponseGeneration_conversationId_createdAt_idx" ON "AutoResponseGeneration"("conversationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AutoResponseGeneration_conversationId_sourceMessageId_key" ON "AutoResponseGeneration"("conversationId", "sourceMessageId");

-- CreateIndex
CREATE INDEX "Appointment_organizationId_scheduledAt_idx" ON "Appointment"("organizationId", "scheduledAt");

-- CreateIndex
CREATE INDEX "Appointment_customerId_scheduledAt_idx" ON "Appointment"("customerId", "scheduledAt");

-- CreateIndex
CREATE INDEX "ManualFolder_hospitalId_parentId_sortOrder_idx" ON "ManualFolder"("hospitalId", "parentId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ManualFolder_hospitalId_name_key" ON "ManualFolder"("hospitalId", "name");

-- CreateIndex
CREATE INDEX "ManualDocument_folderId_sortOrder_idx" ON "ManualDocument"("folderId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ManualDocument_hospitalId_slug_key" ON "ManualDocument"("hospitalId", "slug");

-- CreateIndex
CREATE INDEX "ManualDocumentImage_documentId_sortOrder_idx" ON "ManualDocumentImage"("documentId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ManualDocumentImage_documentId_objectKey_key" ON "ManualDocumentImage"("documentId", "objectKey");

-- CreateIndex
CREATE INDEX "ManualTag_hospitalId_idx" ON "ManualTag"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "ManualTag_hospitalId_name_key" ON "ManualTag"("hospitalId", "name");

-- CreateIndex
CREATE INDEX "ManualDocumentTag_tagId_idx" ON "ManualDocumentTag"("tagId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthUser" ADD CONSTRAINT "AuthUser_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AuthUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthAccount" ADD CONSTRAINT "AuthAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AuthUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelConnection" ADD CONSTRAINT "ChannelConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientChannel" ADD CONSTRAINT "PatientChannel_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientChannel" ADD CONSTRAINT "PatientChannel_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientTag" ADD CONSTRAINT "PatientTag_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientTagAssignment" ADD CONSTRAINT "PatientTagAssignment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientTagAssignment" ADD CONSTRAINT "PatientTagAssignment_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "PatientTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_patientChannelId_fkey" FOREIGN KEY ("patientChannelId") REFERENCES "PatientChannel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationAssignee" ADD CONSTRAINT "ConversationAssignee_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationAssignee" ADD CONSTRAINT "ConversationAssignee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "AuthUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatCoachGeneration" ADD CONSTRAINT "ChatCoachGeneration_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatCoachGeneration" ADD CONSTRAINT "ChatCoachGeneration_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatCoachGeneration" ADD CONSTRAINT "ChatCoachGeneration_sourceMessageId_fkey" FOREIGN KEY ("sourceMessageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutoResponseGeneration" ADD CONSTRAINT "AutoResponseGeneration_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutoResponseGeneration" ADD CONSTRAINT "AutoResponseGeneration_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutoResponseGeneration" ADD CONSTRAINT "AutoResponseGeneration_sourceMessageId_fkey" FOREIGN KEY ("sourceMessageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualFolder" ADD CONSTRAINT "ManualFolder_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualFolder" ADD CONSTRAINT "ManualFolder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ManualFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualDocument" ADD CONSTRAINT "ManualDocument_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualDocument" ADD CONSTRAINT "ManualDocument_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "ManualFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualDocumentImage" ADD CONSTRAINT "ManualDocumentImage_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ManualDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualTag" ADD CONSTRAINT "ManualTag_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualDocumentTag" ADD CONSTRAINT "ManualDocumentTag_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ManualDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualDocumentTag" ADD CONSTRAINT "ManualDocumentTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "ManualTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
