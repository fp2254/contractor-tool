/**
 * /api/phone/provision — alias for /api/phone/numbers
 * POST  = provision a Twilio number + Retell agent for this org
 * DELETE = release number and remove Retell agent
 * GET   = return current provisioned number (if any)
 */
export { GET, POST, DELETE, dynamic } from "@/app/api/phone/numbers/route";
