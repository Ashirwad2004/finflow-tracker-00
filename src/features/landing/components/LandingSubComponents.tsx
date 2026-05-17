import { motion } from "framer-motion";

export const FeatureCard = ({ icon: Icon, title, description, delay }: { icon: any, title: string, description: string, delay: number }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{ y: -5 }}
      className="p-6 rounded-2xl bg-card border border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 group"
    >
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
        <Icon className="w-6 h-6 text-primary" />
      </div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </motion.div>
  );
};

export const StatCounter = ({ value, label }: { value: string, label: string }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      className="text-center"
    >
      <div className="text-4xl md:text-5xl font-extrabold bg-gradient-to-br from-primary to-violet-600 bg-clip-text text-transparent mb-2">
        {value}
      </div>
      <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider">{label}</div>
    </motion.div>
  );
};
