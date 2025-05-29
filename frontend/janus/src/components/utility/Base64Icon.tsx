export interface Base64IconProps {
    src: string
}

export default function Base64Icon(porps: Base64IconProps) {
    return (
      <img
        src={porps.src}
        alt="icon"
        width={24}
        height={24}
      />
    );
  }
