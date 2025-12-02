import argparse
import os
import cv2
import numpy as np


def estimate_dpi(img_height_px, cheque_height_inches=3.5):
	"""Estimate DPI from image height assuming standard cheque height."""
	return img_height_px / cheque_height_inches


def find_signature_bbox(img, debug=False):
	"""
	Extract signature box from cheque using physical dimensions:
	- Cheque: 7.5" wide x 3.5" tall
	- Signature box: located at (3", 5") with width 4.5" and height 0.25"
	Note: (3", 5") is in cheque template coordinates; signature y is below print area.
	Signature area is defined as the region above the "sign here" line.
	"""
	# img: BGR
	h, w = img.shape[:2]
	
	# Estimate DPI from image height
	dpi = estimate_dpi(h)
	
	# Convert physical dimensions to pixels
	# Signature box in cheque coordinates (from top-left of cheque)
	sig_x_inches = 3.0      # Starting X position
	sig_width_inches = 4.5  # Width of signature box
	sig_y_inches = 2.3      # Approximate Y position (adjust based on cheque template)
	sig_height_inches = 0.5  # Height of signature box
	
	# Convert to pixels
	sig_x_px = int(sig_x_inches * dpi)
	sig_width_px = int(sig_width_inches * dpi)
	sig_y_px = int(sig_y_inches * dpi)
	sig_height_px = int(sig_height_inches * dpi)
	
	# Define bounding box
	x1 = max(0, sig_x_px)
	y1 = max(0, sig_y_px)
	x2 = min(w, sig_x_px + sig_width_px)
	y2 = min(h, sig_y_px + sig_height_px)
	
	if debug:
		debug_img = img.copy()
		cv2.rectangle(debug_img, (x1, y1), (x2, y2), (0, 255, 0), 2)
		# Add text annotation
		cv2.putText(debug_img, f'DPI: {dpi:.1f}', (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
		cv2.putText(debug_img, f'Sig Box: ({x1}, {y1}) to ({x2}, {y2})', (10, 70), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
		cv2.imwrite('debug_signature_bbox.png', debug_img)
	
	return x1, y1, x2, y2


def save_cropped_signature(img, bbox, out_path, with_alpha=True):
	x1, y1, x2, y2 = bbox
	crop = img[y1:y2, x1:x2]

	gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
	_, mask = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

	if with_alpha:
		b, g, r = cv2.split(crop)
		alpha = mask
		rgba = cv2.merge([b, g, r, alpha])
		cv2.imwrite(out_path, rgba)
	else:
		# place on white background
		white = 255 * np.ones_like(crop)
		mask3 = cv2.cvtColor(mask, cv2.COLOR_GRAY2BGR) // 255
		composite = np.where(mask3 == 1, crop, white)
		cv2.imwrite(out_path, composite)


def main():
	parser = argparse.ArgumentParser(description='Extract signature bounding box from cheque image')
	parser.add_argument('input', help='Input cheque image path')
	parser.add_argument('output', help='Output signature image path (png recommended)')
	parser.add_argument('--no-alpha', action='store_true', help='Save without alpha channel (white background)')
	parser.add_argument('--debug', action='store_true', help='Write debug images to working dir')
	parser.add_argument('--json', action='store_true', help='Output results in JSON format')
	args = parser.parse_args()

	if not os.path.isfile(args.input):
		print('Input file does not exist:', args.input)
		return

	img = cv2.imread(args.input)
	if img is None:
		print('Failed to read image:', args.input)
		return

	try:
		bbox = find_signature_bbox(img, debug=args.debug)
	except Exception as e:
		print('Error locating signature:', e)
		return

	save_cropped_signature(img, bbox, args.output, with_alpha=not args.no_alpha)
	
	if args.json:
		import json
		result = {
			"bbox": [bbox[1], bbox[0], bbox[3], bbox[2]], # [ymin, xmin, ymax, xmax]
			"output_file": args.output,
			"image_dim": [img.shape[0], img.shape[1]]
		}
		print(json.dumps(result))
	else:
		print('Saved signature to', args.output)


if __name__ == '__main__':
	main()

