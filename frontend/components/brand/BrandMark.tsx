import Image from "next/image";

type Props = {
  size?: number;
  className?: string;
  priority?: boolean;
};

/** App wordmark icon — `Cartoon-Robot.png` */
export default function BrandMark({ size = 40, className, priority }: Props) {
  return (
    <Image
      src="/Cartoon-Robot.png"
      alt="AI Tutor"
      width={size}
      height={size}
      className={className}
      priority={priority}
    />
  );
}
