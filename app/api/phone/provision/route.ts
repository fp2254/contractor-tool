/**
 * /api/phone/provision — alias for /api/phone/numbers
 * POST  = provision a Twilio number + Retell agent for this org
 * DELETE = release number and remove Retell agent
 * GET   = return current provisioned number (if any)
 */
export const dynamic = "force-dynamic";
export { GET, POST, DELETE } from "@/app/api/phone/numbers/route";
