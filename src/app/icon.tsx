import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/** Square brand favicon — black tile with a red CYMT mark. */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#08080a",
          fontSize: 22,
          fontWeight: 700,
          color: "#e50914",
          letterSpacing: -1,
        }}
      >
        C
      </div>
    ),
    { ...size },
  );
}
