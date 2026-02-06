function MemberList() {
  return (
    <ul className="list text-xl">
      <li className="text-center m-4">SpeedCubers</li>
      <li className="list-row bg-secondary text-secondary-content items-center">
        <div className="size-6 border-2 rounded-lg"></div>
        <p className="">Andre</p>
      </li>
      <li className="list-row items-center">
        <div className="size-6 border-2 rounded-lg"></div>
        <p className="">Matt</p>
      </li>
      <li className="list-row items-center">
        <div className="size-6 border-2 rounded-lg"></div>
        <p className="">Jordan</p>
      </li>
    </ul>
  );
}

export default MemberList;
