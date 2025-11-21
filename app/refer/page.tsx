export default function Refer() {
  const referralLink = `https://trade-base.biz/?ref=${user.id}`;

  return (
    <div className="p-8 text-center">
      <h1 className="text-4xl font-bold mb-6">Refer & Earn 20% Forever</h1>
      <p className="text-2xl mb-8">{referralLink}</p>
      <Button className="text-xl p-8">Copy Link</Button>
      <p className="mt-8 text-xl">You’ve earned: $0.00</p>
    </div>
  );
}
