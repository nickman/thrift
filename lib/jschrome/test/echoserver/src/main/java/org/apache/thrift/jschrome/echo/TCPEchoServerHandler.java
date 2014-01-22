/**
 * Helios, OpenSource Monitoring
 * Brought to you by the Helios Development Group
 *
 * Copyright 2007, Helios Development Group and individual contributors
 * as indicated by the @author tags. See the copyright.txt file in the
 * distribution for a full listing of individual contributors.
 *
 * This is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as
 * published by the Free Software Foundation; either version 2.1 of
 * the License, or (at your option) any later version.
 *
 * This software is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this software; if not, write to the Free
 * Software Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA
 * 02110-1301 USA, or see the FSF site: http://www.fsf.org. 
 *
 */
package org.apache.thrift.jschrome.echo;

import java.nio.charset.Charset;
import java.util.concurrent.atomic.AtomicLong;

import org.jboss.netty.buffer.ChannelBuffer;
import org.jboss.netty.buffer.ChannelBuffers;
import org.jboss.netty.channel.ChannelFuture;
import org.jboss.netty.channel.ChannelFutureListener;
import org.jboss.netty.channel.ChannelHandler.Sharable;
import org.jboss.netty.channel.ChannelHandlerContext;
import org.jboss.netty.channel.ExceptionEvent;
import org.jboss.netty.channel.MessageEvent;
import org.jboss.netty.channel.SimpleChannelUpstreamHandler;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * <p>Title: TCPEchoServerHandler</p>
 * <p>Description: Echo server TCP netty handler</p> 
 * <p>Company: Helios Development Group LLC</p>
 * @author Whitehead (nwhitehead AT heliosdev DOT org)
 * <p><code>org.apache.thrift.jschrome.echo.TCPEchoServerHandler</code></p>
 */
@Sharable
public class TCPEchoServerHandler extends AbstractEchoHandler {
	/**
	 * Creates a new TCPEchoServerHandler
	 */
	public TCPEchoServerHandler() {
		super("TCP");
	}
	
	
    /**
     * {@inheritDoc}
     * @see org.jboss.netty.channel.SimpleChannelUpstreamHandler#messageReceived(org.jboss.netty.channel.ChannelHandlerContext, org.jboss.netty.channel.MessageEvent)
     */
    @Override
    public void messageReceived(ChannelHandlerContext ctx, MessageEvent e) {
        // Send back the received message to the remote peer.
       ChannelBuffer buff = (ChannelBuffer)e.getMessage();
       if(isBye(buff)) {
            e.getChannel().write(BYE_MSG).addListener(new ChannelFutureListener() {
                     @Override
                     public void operationComplete(ChannelFuture future) throws Exception {
                           future.getChannel().close();
                     }
              });
            return;
       }
       logger.info("R:" + buff.toString(Charset.defaultCharset()));
       transferredBytes.addAndGet(((ChannelBuffer) e.getMessage()).readableBytes());
       e.getChannel().write(e.getMessage()).addListener(new ChannelFutureListener() {
                     @Override
                     public void operationComplete(ChannelFuture future) throws Exception {
                           if(future.isSuccess()) {
                                  System.out.println(" S:OK");
                           } else {
                                  System.out.println(" S:FAILED");
                           }
                     }
              });
       
    }
 
}

