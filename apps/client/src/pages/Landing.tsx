function Landing() {
  return (
    <main className="h-screen flex flex-col gap-4 justify-center items-center">
      <div className="w-full flex flex-row gap-4 justify-center items-center">
        <h1 className="font-sans text-7xl">CubeClash</h1>
        <div className="size-24 border-4 rounded-4xl"></div>
      </div>
      <input type="text" placeholder="Enter Name" className="input input-xl" />
      <button className="btn btn-primary btn-xl">Create Room</button>
    </main>
  );
}

export default Landing;
