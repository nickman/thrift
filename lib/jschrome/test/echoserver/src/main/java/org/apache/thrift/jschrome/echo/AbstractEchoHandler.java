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

import java.util.concurrent.atomic.AtomicLong;

import org.jboss.netty.buffer.ChannelBuffer;
import org.jboss.netty.buffer.ChannelBuffers;
import org.jboss.netty.channel.ChannelHandlerContext;
import org.jboss.netty.channel.ExceptionEvent;
import org.jboss.netty.channel.SimpleChannelUpstreamHandler;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * <p>Title: AbstractEchoHandler</p>
 * <p>Description: Base class for echo handlers</p> 
 * <p>Company: Helios Development Group LLC</p>
 * @author Whitehead (nwhitehead AT heliosdev DOT org)
 * <p><code>org.apache.thrift.jschrome.echo.AbstractEchoHandler</code></p>
 */

public abstract class AbstractEchoHandler extends SimpleChannelUpstreamHandler {
	/** Static class logger */
	protected final Logger logger; 

	/** Byte transfer counter */
    protected final AtomicLong transferredBytes = new AtomicLong();
   
    /** Buffer pattern indicating a session close */
    protected static final ChannelBuffer BYE_BUFF = ChannelBuffers.unmodifiableBuffer(ChannelBuffers.wrappedBuffer("BYE!".getBytes()));
    /** Message buffer sent as a handshake on a client connection close  */
    protected static final ChannelBuffer BYE_MSG = ChannelBuffers.unmodifiableBuffer(ChannelBuffers.wrappedBuffer("Bye now...".getBytes()));
 
    /**
     * Returns the number of transferred bytes
     * @return the number of transferred bytes
     */
    public long getTransferredBytes() {
        return transferredBytes.get();
    }
	
	
	/**
	 * Creates a new AbstractEchoHandler
	 * @param loggerName The logger name for the handler
	 */
	protected AbstractEchoHandler(String loggerName) {
		logger = LoggerFactory.getLogger(loggerName);
	}
	
    /**
     * {@inheritDoc}
     * @see org.jboss.netty.channel.SimpleChannelUpstreamHandler#exceptionCaught(org.jboss.netty.channel.ChannelHandlerContext, org.jboss.netty.channel.ExceptionEvent)
     */
    @Override
    public void exceptionCaught(ChannelHandlerContext ctx, ExceptionEvent e) {
        // Close the connection when an exception is raised.
        logger.warn("Unexpected exception from downstream.", e.getCause());
        e.getChannel().close();
    }
    
    /**
     * Determines if the incoming starts with a bye message
     * @param incoming the incoming channel buffer
     * @return true for bye, false otherwise
     */
    protected boolean isBye(ChannelBuffer incoming) {
    	if(incoming==null) return false;
    	if(incoming.readableBytes()<4) return false;
    	return incoming.slice(0, 4).equals(BYE_BUFF);
    }
	

}
