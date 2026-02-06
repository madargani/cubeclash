import { useMembers } from "@/hooks/useStore";

function MemberList() {
  const members = useMembers();

  return (
    <ul className="list text-xl [&>:nth-child(2)]:bg-primary [&>:nth-child(2)]:text-primary-content">
      <li className="text-center m-4">Speed Cubers</li>
      {members.map((nickname, index) => (
        <li key={`User ${index}`} className="list-row items-center">
          <div className="size-6 border-2 rounded-lg"></div>
          <p className="">{nickname}</p>
        </li>
      ))}
    </ul>
  );
}

export default MemberList;
