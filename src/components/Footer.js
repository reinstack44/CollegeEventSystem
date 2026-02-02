const Footer = () => {
  return (
    <footer className="w-full py-8 mt-12 border-t border-slate-100 dark:border-slate-800 transition-colors duration-500">
      <div className="container mx-auto px-6 text-center">
        <p className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-[0.2em]">
          © {new Date().getFullYear()} ActiveArch. All Rights Reserved.
        </p>
        <p className="text-[10px] text-slate-300 dark:text-slate-600 mt-2 font-medium">
          Specialized for ADYPU University Events.
        </p>
      </div>
    </footer>
  );
};

export default Footer;