import 'package:flutter/material.dart';
import 'package:lottie/lottie.dart';

class DeliveryAnimation extends StatefulWidget {
  final String? animationPath;
  final double? width;
  final double? height;
  final bool repeat;
  final String message;
  final VoidCallback? onAnimationComplete;

  const DeliveryAnimation({
    super.key,
    this.animationPath,
    this.width = 200,
    this.height = 200,
    this.repeat = true,
    this.message = "Your order is on the way!",
    this.onAnimationComplete,
  });

  @override
  State<DeliveryAnimation> createState() => _DeliveryAnimationState();
}

class _DeliveryAnimationState extends State<DeliveryAnimation>
    with TickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Lottie Animation
          Container(
            width: widget.width,
            height: widget.height,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.1),
                  blurRadius: 20,
                  offset: const Offset(0, 10),
                ),
              ],
            ),
            child: widget.animationPath != null
                ? Lottie.asset(
                    widget.animationPath!,
                    controller: _controller,
                    width: widget.width,
                    height: widget.height,
                    fit: BoxFit.contain,
                    repeat: widget.repeat,
                    onLoaded: (composition) {
                      _controller
                        ..duration = composition.duration;
                      
                      if (widget.repeat) {
                        _controller.repeat();
                      } else {
                        _controller.forward();
                        if (widget.onAnimationComplete != null) {
                          _controller.addStatusListener((status) {
                            if (status == AnimationStatus.completed) {
                              widget.onAnimationComplete!();
                            }
                          });
                        }
                      }
                    },
                    errorBuilder: (context, error, stackTrace) {
                      return _buildFallbackAnimation();
                    },
                  )
                : _buildFallbackAnimation(),
          ),
          
          const SizedBox(height: 24),
          
          // Message
          Text(
            widget.message,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w600,
              color: Theme.of(context).colorScheme.primary,
            ),
            textAlign: TextAlign.center,
          ),
          
          const SizedBox(height: 12),
          
          // Subtitle
          Text(
            "Hang tight! Our delivery rider is bringing your delicious ramen to you.",
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: Colors.grey[600],
              height: 1.5,
            ),
            textAlign: TextAlign.center,
          ),
          
          const SizedBox(height: 32),
          
          // Animated dots indicator
          _buildLoadingDots(),
        ],
      ),
    );
  }

  Widget _buildFallbackAnimation() {
    return Container(
      width: widget.width,
      height: widget.height,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Theme.of(context).colorScheme.primary.withOpacity(0.1),
            Theme.of(context).colorScheme.primary.withOpacity(0.05),
          ],
        ),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.delivery_dining,
            size: 80,
            color: Theme.of(context).colorScheme.primary,
          ),
          const SizedBox(height: 16),
          Text(
            "🏍️💨",
            style: const TextStyle(fontSize: 32),
          ),
        ],
      ),
    );
  }

  Widget _buildLoadingDots() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(3, (index) {
        return AnimatedBuilder(
          animation: _controller,
          builder: (context, child) {
            final delay = index * 0.2;
            final progress = (_controller.value - delay).clamp(0.0, 1.0);
            final scale = 1.0 + (0.5 * (1.0 - (progress - 0.5).abs() * 2).clamp(0.0, 1.0));
            
            return Container(
              margin: const EdgeInsets.symmetric(horizontal: 4),
              child: Transform.scale(
                scale: scale,
                child: Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.primary,
                    shape: BoxShape.circle,
                  ),
                ),
              ),
            );
          },
        );
      }),
    );
  }
}

// Delivery Status Widget for Order Tracking
class DeliveryStatusWidget extends StatelessWidget {
  final String orderStatus;
  final String? lottieAnimationPath;
  final Map<String, dynamic>? orderDetails;
  final String? deliveryMethod;

  const DeliveryStatusWidget({
    super.key,
    required this.orderStatus,
    this.lottieAnimationPath,
    this.orderDetails,
    this.deliveryMethod,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 10,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: Column(
        children: [
          _buildStatusHeader(context),
          const SizedBox(height: 20),
          if (_shouldShowAnimation()) ...[
            _buildAnimationForOrderType(context),
          ] else ...[
            _buildStatusIcon(context),
            const SizedBox(height: 16),
            Text(
              _getStatusMessage(),
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.w600,
                color: Theme.of(context).colorScheme.primary,
              ),
              textAlign: TextAlign.center,
            ),
          ],
          const SizedBox(height: 20),
          _buildOrderDetails(context),
        ],
      ),
    );
  }

  Widget _buildStatusHeader(BuildContext context) {
    return Row(
      children: [
        Flexible(
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: _getStatusColor().withOpacity(0.1),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              orderStatus.toUpperCase(),
              style: TextStyle(
                color: _getStatusColor(),
                fontWeight: FontWeight.w600,
                fontSize: 12,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ),
        const SizedBox(width: 8),
        Icon(
          _getStatusIcon(),
          color: _getStatusColor(),
          size: 24,
        ),
      ],
    );
  }

  Widget _buildStatusIcon(BuildContext context) {
    return Container(
      width: 80,
      height: 80,
      decoration: BoxDecoration(
        color: _getStatusColor().withOpacity(0.1),
        shape: BoxShape.circle,
      ),
      child: Icon(
        _getStatusIcon(),
        size: 40,
        color: _getStatusColor(),
      ),
    );
  }

  Widget _buildOrderDetails(BuildContext context) {
    if (orderDetails == null) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.grey[50],
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (orderDetails!['orderId'] != null) ...[
            Row(
              children: [
                const Icon(Icons.receipt_outlined, size: 16),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Order #${orderDetails!['orderId']}',
                    style: const TextStyle(fontWeight: FontWeight.w600),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
          ],
          if (orderDetails!['estimatedTime'] != null) ...[
            Row(
              children: [
                const Icon(Icons.access_time, size: 16),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'ETA: ${orderDetails!['estimatedTime']}',
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
          ],
          if (orderDetails!['deliveryAddress'] != null) ...[
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.location_on_outlined, size: 16),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    orderDetails!['deliveryAddress'],
                    overflow: TextOverflow.visible,
                    softWrap: true,
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildAnimationForOrderType(BuildContext context) {
    final isPickup = deliveryMethod?.toLowerCase() == 'pickup';
    
    if (isPickup && orderStatus.toLowerCase() == 'ready') {
      // Show pickup animation for ready pickup orders
      return _buildPickupAnimation(context);
    } else if (!isPickup && (orderStatus.toLowerCase() == 'out for delivery' || orderStatus.toLowerCase() == 'outfordelivery')) {
      // Show delivery animation only for delivery orders when out for delivery
      return DeliveryAnimation(
        animationPath: lottieAnimationPath ?? 'assets/animations/delivery_guy.json',
        message: _getStatusMessage(),
        width: 150,
        height: 150,
      );
    } else {
      // Show static icon for other states
      return Column(
        children: [
          _buildStatusIcon(context),
          const SizedBox(height: 16),
          Text(
            _getStatusMessage(),
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
              fontWeight: FontWeight.w600,
              color: Theme.of(context).colorScheme.primary,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      );
    }
  }

  Widget _buildPickupAnimation(BuildContext context) {
    return Column(
      children: [
        Container(
          width: 150,
          height: 150,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Theme.of(context).colorScheme.primary.withOpacity(0.1),
                Theme.of(context).colorScheme.primary.withOpacity(0.05),
              ],
            ),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.store,
                size: 60,
                color: Theme.of(context).colorScheme.primary,
              ),
              const SizedBox(height: 8),
              Text(
                "🛍️",
                style: const TextStyle(fontSize: 32),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        Text(
          _getStatusMessage(),
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.w600,
            color: Theme.of(context).colorScheme.primary,
          ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 12),
        Text(
          "Your order is ready for pickup at our store!",
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
            color: Colors.grey[600],
            height: 1.5,
          ),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }

  bool _shouldShowAnimation() {
    final isPickup = deliveryMethod?.toLowerCase() == 'pickup';
    return (isPickup && orderStatus.toLowerCase() == 'ready') ||
           (!isPickup && (orderStatus.toLowerCase() == 'out for delivery' || orderStatus.toLowerCase() == 'outfordelivery'));
  }

  String _getStatusMessage() {
    final isPickup = deliveryMethod?.toLowerCase() == 'pickup';
    
    switch (orderStatus.toLowerCase()) {
      case 'preparing':
        return 'Preparing your order';
      case 'ready':
        return isPickup ? 'Ready for pickup!' : 'Order is ready!';
      case 'outfordelivery':
      case 'out for delivery':
      case 'on the way':
        return 'On the way to you!';
      case 'delivered':
        return isPickup ? 'Order picked up!' : 'Order delivered!';
      default:
        return 'Order status: $orderStatus';
    }
  }

  Color _getStatusColor() {
    switch (orderStatus.toLowerCase()) {
      case 'preparing':
        return Colors.orange;
      case 'ready':
        return Colors.blue;
      case 'out for delivery':
      case 'on the way':
        return Colors.green;
      case 'delivered':
        return Colors.purple;
      default:
        return Colors.grey;
    }
  }

  IconData _getStatusIcon() {
    final isPickup = deliveryMethod?.toLowerCase() == 'pickup';
    
    switch (orderStatus.toLowerCase()) {
      case 'preparing':
        return Icons.restaurant;
      case 'ready':
        return isPickup ? Icons.store : Icons.check_circle_outline;
      case 'out for delivery':
      case 'on the way':
        return Icons.delivery_dining;
      case 'delivered':
        return Icons.check_circle;
      default:
        return Icons.info_outline;
    }
  }
}
