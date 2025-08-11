import React from "react";
import "./VirtualKeyboard.css";

const VirtualKeyboard = ({ onKeyPress }) => {
  const layout = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["0", "Reset"]
];


  return (
    <div className="vk-container">
      {layout.map((row, rowIndex) => (
  <div key={rowIndex} className="vk-row">
    {row.map((key, index) => {
      // Nếu là hàng cuối và là nút "Reset"
      const isReset = rowIndex === layout.length - 1 && key === "Reset";
      return (
        <button
          key={index}
          className={`vk-btn ${isReset ? "reset wide" : ""}`}
          onClick={(e) => {
            e.preventDefault();
            onKeyPress(key);
          }}
        >
          {key}
        </button>
      );
    })}
  </div>
))}
    </div>
  );
};

export default VirtualKeyboard;
